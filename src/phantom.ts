export interface PhantomPublicKey {
  toString(): string;
}

export interface PhantomSolanaProvider {
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: PhantomPublicKey | null;
  connect(options?: {
    onlyIfTrusted?: boolean;
  }): Promise<{ publicKey: PhantomPublicKey }>;
  disconnect(): Promise<void>;
  on(
    event: "connect" | "accountChanged",
    callback: (key: PhantomPublicKey | null) => void,
  ): void;
  on(event: "disconnect", callback: () => void): void;
  removeListener?(event: string, callback: (...args: never[]) => void): void;
}

declare global {
  interface Window {
    phantom?: { solana?: PhantomSolanaProvider };
  }
}

export function getPhantomProvider(): PhantomSolanaProvider | null {
  const provider = window.phantom?.solana;
  return provider?.isPhantom ? provider : null;
}
