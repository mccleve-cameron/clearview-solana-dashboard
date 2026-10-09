import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  ExternalLink,
  Fingerprint,
  LockKeyhole,
  Radio,
  RefreshCw,
  ShieldCheck,
  Wallet2,
  XCircle,
} from "lucide-react";
import { getPhantomProvider, type PhantomPublicKey } from "./phantom";
import {
  addressExplorerUrl,
  explorerUrl,
  getRecentActivity,
  getSolBalance,
  type Network,
  type SignatureInfo,
} from "./solana";
import "./App.css";

function shorten(value: string, start = 6, end = 5): string {
  return value.length <= start + end + 3
    ? value
    : value.slice(0, start) + "…" + value.slice(-end);
}

function formatBalance(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(
    value,
  );
}

function dateLabel(seconds: number | null): string {
  if (!seconds) return "Time unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(seconds * 1000));
}

interface WalletSnapshot {
  key: string;
  balance: number | null;
  activity: SignatureInfo[];
  error: string;
  updatedAt: Date | null;
}

function FlowGraphic() {
  return (
    <div
      className="flow-graphic"
      aria-label="Your wallet shares a public address, then this dashboard reads Solana network data"
    >
      <div className="flow-grid" aria-hidden="true" />
      <div className="flow-orbit flow-orbit-one" aria-hidden="true" />
      <div className="flow-orbit flow-orbit-two" aria-hidden="true" />
      <div className="flow-node flow-node-wallet">
        <span className="flow-node-icon">
          <Wallet2 size={26} strokeWidth={1.8} />
        </span>
        <span className="flow-node-label">YOUR WALLET</span>
      </div>
      <div className="flow-connector flow-connector-one" aria-hidden="true">
        <span />
      </div>
      <div className="flow-node flow-node-network">
        <span className="flow-node-icon">
          <Radio size={28} strokeWidth={1.7} />
        </span>
        <span className="flow-node-label">SOLANA NETWORK</span>
      </div>
      <div className="flow-connector flow-connector-two" aria-hidden="true">
        <span />
      </div>
      <div className="flow-node flow-node-view">
        <span className="flow-node-icon">
          <Activity size={27} strokeWidth={1.8} />
        </span>
        <span className="flow-node-label">CLEAR VIEW</span>
      </div>
      <span className="flow-corner flow-corner-top" aria-hidden="true">
        01 / CONNECT
      </span>
      <span className="flow-corner flow-corner-bottom" aria-hidden="true">
        READ-ONLY BY DESIGN
      </span>
    </div>
  );
}

function App() {
  const [hasProvider, setHasProvider] = useState(() =>
    Boolean(getPhantomProvider()),
  );
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [network, setNetwork] = useState<Network>("mainnet");
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const queryKey = address ? address + ":" + network + ":" + refreshCount : "";
  const current = snapshot?.key === queryKey ? snapshot : null;
  const balance = current?.balance ?? null;
  const activity = current?.activity ?? [];
  const dataError = current?.error ?? "";
  const updatedAt = current?.updatedAt ?? null;
  const isLoading = Boolean(address) && current === null;

  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider) return;

    let active = true;

    const setPublicKey = (key?: PhantomPublicKey | null) => {
      setAddress(key?.toString() || null);
      setConnectionError("");
    };
    const clearPublicKey = () => setAddress(null);
    provider.on("connect", setPublicKey);
    provider.on("accountChanged", setPublicKey);
    provider.on("disconnect", clearPublicKey);
    provider
      .connect({ onlyIfTrusted: true })
      .then(({ publicKey }) => {
        if (active) setPublicKey(publicKey);
      })
      .catch(() => {
        /* An untrusted app waits for an explicit click. */
      });
    return () => {
      active = false;
      provider.removeListener?.("connect", setPublicKey);
      provider.removeListener?.("accountChanged", setPublicKey);
      provider.removeListener?.("disconnect", clearPublicKey);
    };
  }, []);

  useEffect(() => {
    if (!address) return;
    const controller = new AbortController();
    Promise.all([
      getSolBalance(address, network, controller.signal),
      getRecentActivity(address, network, controller.signal),
    ])
      .then(([nextBalance, nextActivity]) => {
        if (controller.signal.aborted) return;
        setSnapshot({
          key: queryKey,
          balance: nextBalance,
          activity: nextActivity,
          error: "",
          updatedAt: new Date(),
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSnapshot({
          key: queryKey,
          balance: null,
          activity: [],
          error:
            error instanceof Error
              ? error.message
              : "Could not load network data.",
          updatedAt: null,
        });
      });
    return () => controller.abort();
  }, [address, network, queryKey]);

  const connect = useCallback(async () => {
    const provider = getPhantomProvider();
    if (!provider) {
      setHasProvider(false);
      return;
    }
    setConnectionError("");
    setIsConnecting(true);
    try {
      const { publicKey } = await provider.connect();
      setAddress(publicKey.toString());
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : "Connection was not completed.",
      );
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getPhantomProvider();
    if (!provider) return;
    try {
      await provider.disconnect();
      setAddress(null);
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Could not disconnect wallet.",
      );
    }
  }, []);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setConnectionError(
        "Clipboard access is unavailable. Select the address to copy it manually.",
      );
    }
  }, [address]);

  const connectAction =
    hasProvider === false ? (
      <a
        className="button button-primary"
        href="https://phantom.com/download"
        target="_blank"
        rel="noopener noreferrer"
      >
        Get Phantom <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    ) : (
      <button
        className="button button-primary"
        onClick={connect}
        disabled={isConnecting}
      >
        <Wallet2 size={18} aria-hidden="true" />{" "}
        {isConnecting ? "Waiting for Phantom…" : "Connect Phantom"}
      </button>
    );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#main" aria-label="Clearview home">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span>
              CLEARVIEW<span className="brand-dot">.</span>
            </span>
          </a>
          <div className="header-right">
            <span className="header-network">
              <span className="live-dot" /> SOLANA EXPLORER
            </span>
            {address ? (
              <button
                className="header-wallet"
                onClick={disconnect}
                title="Disconnect wallet"
              >
                <span className="header-wallet-dot" /> {shorten(address, 4, 4)}{" "}
                <span className="header-wallet-divider" /> Disconnect
              </button>
            ) : (
              connectAction
            )}
          </div>
        </div>
      </header>
      <main id="main">
        {!address ? (
          <>
            <section className="intro-section">
              <div className="intro-copy">
                <span className="eyebrow">
                  <span className="eyebrow-line" /> YOUR WALLET, IN FOCUS
                </span>
                <h1>
                  Understand your wallet at a glance
                  <span className="accent-period">.</span>
                </h1>
                <p className="intro-description">
                  Connect Phantom to see your SOL balance and recent on-chain
                  activity in one calm, readable place.
                </p>
                <div className="intro-actions">
                  {connectAction}
                  <span className="intro-note">
                    <LockKeyhole size={15} aria-hidden="true" /> Read-only. No
                    transactions or signatures.
                  </span>
                </div>
                {hasProvider === false && (
                  <p className="helper-message">
                    Install the Phantom browser extension, then refresh this
                    page to connect.
                  </p>
                )}
                {connectionError && (
                  <p className="message message-error" role="alert">
                    <CircleAlert size={16} /> {connectionError}
                  </p>
                )}
              </div>
              <FlowGraphic />
            </section>
            <section className="value-strip" aria-label="How Clearview works">
              <div>
                <span className="strip-number">01</span>
                <span>Connect your Phantom wallet</span>
              </div>
              <ArrowRight
                className="strip-arrow"
                size={18}
                aria-hidden="true"
              />
              <div>
                <span className="strip-number">02</span>
                <span>Read public Solana data</span>
              </div>
              <ArrowRight
                className="strip-arrow"
                size={18}
                aria-hidden="true"
              />
              <div>
                <span className="strip-number">03</span>
                <span>Explore your activity</span>
              </div>
            </section>
            <section className="trust-section">
              <div className="trust-icon">
                <ShieldCheck size={25} strokeWidth={1.6} />
              </div>
              <div>
                <h2>Made to observe, not move funds.</h2>
                <p>
                  Clearview requests only your public wallet address. It reads
                  network data from Solana and never asks you to sign a message
                  or transaction.
                </p>
              </div>
              <a
                href="https://docs.phantom.com/solana/establishing-a-connection"
                target="_blank"
                rel="noopener noreferrer"
              >
                How connections work{" "}
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </section>
          </>
        ) : (
          <div className="dashboard">
            <section className="dashboard-heading">
              <div>
                <span className="eyebrow">
                  <span className="eyebrow-line" /> WALLET OVERVIEW
                </span>
                <h1>
                  Your wallet, clearly<span className="accent-period">.</span>
                </h1>
                <p>
                  Public on-chain information for your connected Solana address.
                </p>
              </div>
              <fieldset className="network-switch" aria-label="Solana network">
                <legend>NETWORK</legend>
                <label>
                  <input
                    type="radio"
                    name="network"
                    checked={network === "mainnet"}
                    onChange={() => setNetwork("mainnet")}
                  />
                  <span>Mainnet</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="network"
                    checked={network === "devnet"}
                    onChange={() => setNetwork("devnet")}
                  />
                  <span>Devnet</span>
                </label>
              </fieldset>
            </section>
            <section className="summary-grid" aria-label="Wallet summary">
              <div className="balance-panel">
                <div className="panel-topline">
                  <span>
                    <span className="pulse-dot" /> NATIVE SOL BALANCE
                  </span>
                  <Wallet2 size={20} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="balance-value" aria-live="polite">
                  {isLoading ? (
                    <span className="loading-line" />
                  ) : balance === null ? (
                    "—"
                  ) : (
                    formatBalance(balance)
                  )}{" "}
                  <span>SOL</span>
                </div>
                <p>
                  On{" "}
                  {network === "mainnet" ? "Solana Mainnet" : "Solana Devnet"}.
                  Token holdings are not included.
                </p>
                <div className="balance-bottom">
                  <span>
                    {updatedAt
                      ? "Updated " +
                        dateLabel(Math.floor(updatedAt.getTime() / 1000))
                      : "Waiting for network data"}
                  </span>
                  <button
                    onClick={() => setRefreshCount((n) => n + 1)}
                    disabled={isLoading}
                    aria-label="Refresh wallet data"
                  >
                    <RefreshCw size={16} className={isLoading ? "spin" : ""} />
                  </button>
                </div>
              </div>
              <div className="address-panel">
                <div className="panel-topline">
                  <span>CONNECTED ADDRESS</span>
                  <Fingerprint size={21} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="address-display" title={address}>
                  {shorten(address, 9, 8)}
                </div>
                <p>Only your public address is shared with this dashboard.</p>
                <div className="address-actions">
                  <button onClick={copyAddress}>
                    <span>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </span>
                    {copied ? "Copied" : "Copy address"}
                  </button>
                  <a
                    href={addressExplorerUrl(address, network)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Solana Explorer <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </section>
            {connectionError && (
              <p className="message message-error" role="alert">
                <CircleAlert size={16} /> {connectionError}
              </p>
            )}
            {dataError && (
              <div className="message message-error data-message" role="alert">
                <CircleAlert size={17} />
                <span>{dataError}</span>
                <button onClick={() => setRefreshCount((n) => n + 1)}>
                  Try again
                </button>
              </div>
            )}
            <section
              className="activity-section"
              aria-labelledby="activity-title"
            >
              <div className="section-heading">
                <div>
                  <span className="section-kicker">ON-CHAIN ACTIVITY</span>
                  <h2 id="activity-title">Recent transactions</h2>
                </div>
                <span className="activity-network">
                  <span className="live-dot" />{" "}
                  {network === "mainnet" ? "MAINNET" : "DEVNET"} · LAST 6
                </span>
              </div>
              {isLoading ? (
                <div className="activity-state">
                  <RefreshCw className="spin" size={24} />
                  <p>Reading recent activity…</p>
                </div>
              ) : dataError ? (
                <div className="activity-state">
                  <CircleAlert size={24} />
                  <p>Activity is unavailable until the network responds.</p>
                </div>
              ) : activity.length === 0 ? (
                <div className="activity-state">
                  <Activity size={25} />
                  <p>
                    No recent transactions found on{" "}
                    {network === "mainnet" ? "Mainnet" : "Devnet"}.
                  </p>
                  <span>Try the other network if you expected activity.</span>
                </div>
              ) : (
                <div className="transaction-list">
                  {activity.map((item) => (
                    <a
                      className="transaction"
                      key={item.signature}
                      href={explorerUrl(item.signature, network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={
                        "View transaction " +
                        item.signature +
                        " on Solana Explorer"
                      }
                    >
                      <span
                        className={
                          "transaction-icon " +
                          (item.err ? "transaction-failed" : "")
                        }
                      >
                        {item.err ? (
                          <XCircle size={19} />
                        ) : (
                          <Activity size={19} />
                        )}
                      </span>
                      <span className="transaction-main">
                        <strong>
                          {item.memo ? "Transaction with memo" : "Transaction"}
                        </strong>
                        <small>{shorten(item.signature, 8, 8)}</small>
                      </span>
                      <span className="transaction-meta">
                        <span
                          className={
                            item.err ? "status-failed" : "status-success"
                          }
                        >
                          {item.err ? "Failed" : "Confirmed"}
                        </span>
                        <small>{dateLabel(item.blockTime)}</small>
                      </span>
                      <ArrowUpRight
                        className="transaction-arrow"
                        size={18}
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
              )}
            </section>
            <aside className="read-only-note">
              <ShieldCheck size={19} />
              <span>
                This dashboard cannot send transactions. Connection grants
                access to your public address only.
              </span>
            </aside>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <span className="footer-brand">
          <span className="brand-mark mini" aria-hidden="true">
            <span />
          </span>{" "}
          CLEARVIEW.
        </span>
        <span>
          Independent portfolio project · Built with React and TypeScript
        </span>
        <span className="footer-safe">
          <CheckCircle2 size={14} /> READ-ONLY CONNECTION
        </span>
      </footer>
    </div>
  );
}

export default App;
