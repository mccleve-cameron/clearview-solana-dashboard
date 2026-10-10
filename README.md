# Clearview

A read-only Solana wallet dashboard built with React and TypeScript. Connect the Phantom browser extension to view a public address, its native SOL balance, and the six most recent confirmed transaction signatures.

[Try the live prototype](https://cameron-mccleve-portfolio.mcclevage.chatgpt.site/clearview/) · [Read the case study](https://cameron-mccleve-portfolio.mcclevage.chatgpt.site/work#clearview)

The live prototype includes a clearly labeled sample view so visitors can inspect the dashboard without connecting a wallet. Sample values and transactions are illustrative and never linked to Solana Explorer. A real wallet connection reads public on-chain data through Solana JSON-RPC.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite in a browser with the [Phantom extension](https://phantom.com/download) installed. Phantom injects its provider on `localhost`, `127.0.0.1`, or HTTPS pages. Approve the connection request to share your public address. This app never requests a signature or sends a transaction.

## What it does

- Detects Phantom's injected Solana provider and connects only after user approval. A previously trusted connection can reconnect without a popup.
- Handles disconnects and account switches from the extension.
- Queries Solana's public JSON-RPC API for native SOL balance and recent transaction signatures. Toggle between Mainnet and Devnet.
- Shows loading, empty, failure, and retry states. The address can be copied or viewed on Solana Explorer.
- Keeps wallet keys inside Phantom. No server, private key, seed phrase, or transaction-signing code is used.

## Implementation notes

The UI uses [Phantom's documented direct provider integration](https://docs.phantom.com/solana/integrating-phantom) and [Solana's JSON-RPC methods](https://solana.com/docs/rpc/http). Phantom's React SDK was considered, but its current dependency tree reported security advisories during setup. The direct provider uses no wallet SDK dependencies and is enough for this extension-only, read-only app.

This prototype displays the **native SOL balance only**, not SPL token holdings or a fiat portfolio value. Recent activity lists signatures and status; it does not infer transfers or amounts from signatures. Solana's free public RPC endpoints may rate-limit requests. A production release would use a dedicated RPC provider and stronger availability monitoring.

## Checks

```bash
npm run build
npm run lint
npm test
npm audit --audit-level=moderate
```

Clearview is an independent portfolio project and is not affiliated with Phantom or Solana.
