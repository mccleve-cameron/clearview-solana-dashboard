# Clearview

A read-only Solana wallet dashboard built with React and TypeScript. Connect Phantom or paste a public Solana address to view its live native SOL balance and six most recent confirmed transaction signatures.

[Try the live prototype](https://cameron-mccleve-portfolio.mcclevage.chatgpt.site/clearview/) · [Read the case study](https://cameron-mccleve-portfolio.mcclevage.chatgpt.site/work#clearview)

The live prototype includes a clearly labeled sample view so visitors can inspect the dashboard without connecting a wallet. Sample values and transactions are illustrative and never linked to Solana Explorer. Wallet connections and public-address lookups read on-chain data through Solana JSON-RPC.

On iPhone, open the live URL inside Phantom's in-app browser using its Explore/search bar, then tap **Connect Phantom**. Other mobile browsers cannot connect to the separate Phantom app. The public-address lookup works without a wallet connection in any supported browser; it does not verify address ownership.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite in a browser with the [Phantom extension](https://phantom.com/download) installed. Phantom injects its provider on `localhost`, `127.0.0.1`, or HTTPS pages. Approve the connection request to share your public address. This app never requests a signature or sends a transaction.

## What it does

- Detects Phantom's injected Solana provider in the desktop extension or Phantom mobile browser and connects only after user approval. A previously trusted connection can reconnect without a popup.
- Offers a public-address lookup for live data without a wallet connection, with clear source labeling.
- Handles disconnects and account switches from the extension.
- Queries PublicNode's public Mainnet RPC and Solana's public Devnet RPC for native SOL balance and recent transaction signatures. Toggle between Mainnet and Devnet.
- Shows loading, empty, failure, and retry states. The address can be copied or viewed on Solana Explorer.
- Keeps wallet keys inside Phantom. No server, private key, seed phrase, or transaction-signing code is used.

## Implementation notes

The UI uses [Phantom's documented direct provider integration](https://docs.phantom.com/solana/integrating-phantom) and [Solana's JSON-RPC methods](https://solana.com/docs/rpc/http). The direct provider uses no wallet SDK dependencies and is enough for this read-only app in supported Phantom browsers.

This prototype displays the **native SOL balance only**, not SPL token holdings or a fiat portfolio value. Recent activity lists signatures and status; it does not infer transfers or amounts from signatures. Solana's free public RPC endpoints may rate-limit requests. A production release would use a dedicated RPC provider and stronger availability monitoring.

## Checks

```bash
npm run build
npm run lint
npm test
npm audit --audit-level=moderate
```

Clearview is an independent portfolio project and is not affiliated with Phantom or Solana.
