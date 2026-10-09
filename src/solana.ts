export type Network = "mainnet" | "devnet";

export interface SignatureInfo {
  signature: string;
  slot: number;
  err: unknown | null;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus: string | null;
}

const ENDPOINTS: Record<Network, string> = {
  mainnet: "https://api.mainnet.solana.com",
  devnet: "https://api.devnet.solana.com",
};

export function explorerUrl(signature: string, network: Network): string {
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return (
    "https://explorer.solana.com/tx/" + encodeURIComponent(signature) + cluster
  );
}

export function addressExplorerUrl(address: string, network: Network): string {
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return (
    "https://explorer.solana.com/address/" +
    encodeURIComponent(address) +
    cluster
  );
}

async function rpc<T>(
  network: Network,
  method: string,
  params: unknown[],
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(ENDPOINTS[network], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429)
      throw new Error(
        "The public Solana endpoint is busy. Try refreshing in a moment.",
      );
    throw new Error("Solana RPC returned HTTP " + response.status + ".");
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object")
    throw new Error("Solana RPC returned an invalid response.");
  const data = payload as { result?: T; error?: { message?: string } };
  if (data.error)
    throw new Error(
      data.error.message || "Solana RPC could not complete the request.",
    );
  if (data.result === undefined)
    throw new Error("Solana RPC returned no data.");
  return data.result;
}

export async function getSolBalance(
  address: string,
  network: Network,
  signal: AbortSignal,
): Promise<number> {
  const result = await rpc<{ value: number }>(
    network,
    "getBalance",
    [address, { commitment: "confirmed" }],
    signal,
  );
  if (!Number.isFinite(result?.value) || result.value < 0)
    throw new Error("Solana RPC returned an invalid balance.");
  return result.value / 1_000_000_000;
}

export async function getRecentActivity(
  address: string,
  network: Network,
  signal: AbortSignal,
): Promise<SignatureInfo[]> {
  const result = await rpc<unknown>(
    network,
    "getSignaturesForAddress",
    [address, { commitment: "confirmed", limit: 6 }],
    signal,
  );
  if (!Array.isArray(result))
    throw new Error("Solana RPC returned invalid activity data.");
  return result.filter(
    (item): item is SignatureInfo =>
      !!item &&
      typeof item === "object" &&
      typeof item.signature === "string" &&
      typeof item.slot === "number",
  );
}
