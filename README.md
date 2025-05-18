<a href="https://flowchart.app/">
  <img alt="Flow Chart: DeFi & Onchain Analysis for Flow" src="public/images/banner.png" width="300">
  <h1 align="center">Flow Chart</h1>
</a>

<p align="center">
  <strong>Flow Chart</strong> is an open-source DeFi and onchain analytics chatbot for the Flow ecosystem, powered by Vercel Chat SDK and Claude AI.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## What is Flow Chart?

Flow Chart is a chatbot and analytics platform designed to help users analyze DeFi and onchain activity on both Flow-EVM and Flow mainnet. It leverages the Vercel Chat SDK and Claude AI to provide natural language insights, asset management, and transaction tooling for the Flow ecosystem.

---

## Features

- [x] **DeFi & Onchain Analytics for Flow**
- [x] **ERC20 Transfers** on Flow-EVM
- [x] **Token Swaps** on Flow-EVM
- [x] **Onchain Asset Analysis**
- [x] **Asset Query** (including balances and token info)
- [x] **Child Account Discovery** on Flow mainnet
- [x] **Wallet Connection** and context-aware chat
- [x] **Rich UI** with Next.js, shadcn/ui, and Tailwind CSS

### Coming Soon

- [ ] **Flow Mainnet Token Transfers**
- [ ] **Token Bridging** between Flow and Flow-EVM
- [ ] **Cadence Code Runner** for smart contract scripting

---

## Model Providers

Flow Chart uses [Claude AI](https://www.anthropic.com/) as its default LLM, and our own [FLOW-MCP](https://github.com/Outblock/flow-mcp) for processing Flow onchain requests.

---

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Flow Chart. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: Do not commit your `.env` file to version control, as it may expose secrets for your AI and authentication providers.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app should now be running on [localhost:3000](http://localhost:3000).

---

## License

MIT
