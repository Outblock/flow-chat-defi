<a href="https://flowchart.app/">
  <img alt="Flow Chat: DeFi & Onchain Analysis for Flow" src="public/images/banner.png">
  <h1 align="center">Flow Chat</h1>
</a>

<p align="center">
  <strong>Flow Chat</strong> is an open-source DeFi and onchain analytics chatbot for the Flow ecosystem, powered by Vercel Chat SDK and Claude AI.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

# 🧠 Flow Chat · [Try it Live](https://ai-chat-defi.vercel.app/)

**Flow Chat** bridges the power of large language models (LLMs) with the Flow blockchain, unlocking a new frontier for DeFi accessibility and on-chain interaction.

## 🚀 What We Built

During our internal hackathon, we created **Flow Chat DeFi** — a conversational AI interface that enables users to interact with the Flow blockchain using natural language.

We leveraged Retrieval-Augmented Generation (RAG) to teach LLMs about Flow-specific blockchain knowledge, and integrated real-time on-chain data access using our custom **MCP server**. The result: an intelligent agent that can understand and respond to user questions about Flow DeFi — and even help them interact with their wallet — all via chat.

## 💡 Inspiration

AI is transforming what's possible. But just like LLMs, blockchains (especially Flow) operate in sandboxed environments. Our goal was to link these two isolated domains.

What if you could talk to your Flow wallet like a friend? What if an AI could explain DeFi positions, execute transactions, or surface insights in plain English?

That’s the future we’re building towards.

## 🛠️ Technologies Used

- **[ChatSDK](https://chat-sdk.dev/)** – foundation for chat UI/agent interaction
- **[AI-SDK](https://ai-sdk.dev/)** – interface for LLMs and tool usage
- **[MCP Server](https://github.com/Outblock/flow-mcp)** – enables AI to query Flow on-chain/DeFi data
- **RAG (Retrieval-Augmented Generation)** – to inject blockchain knowledge into LLMs
- **[RainbowKit](https://rainbowkit.com/)** – for wallet connection and user onboarding
- **[Vercel](https://vercel.com)** – frontend hosting
- **[Neon DB](https://neon.com/)** – Postgres-compatible serverless database
- **[Railway](https://railway.com/)** – MCP server hosting
- **TypeScript** – everything is written in it

## 🌐 How to Use

1. **Try the demo ** – Interact with Flow DeFi using natural language.
  > https://ai-chat-defi.vercel.app/
2. **Clone the repo** and run locally:
   ```bash
   git clone https://github.com/Outblock/flow-chat-defi.git
   cd flow-chat-defi
   pnpm install
   pnpm run dev
   ```
3. Connect your wallet via RainbowKit
4. Start chatting! Try asking questions like:
   - "What's my current lending position on Flow?"
   - "Can you help me swap $FLOW for $USDC?"
   - "What's the TVL on Lending Protocol X?"

## 🌟 Why It Matters
Flow Chat DeFi makes blockchain more human.
By allowing natural language as the interface to Web3, we're dramatically lowering the barrier to entry. This can empower:
New users curious about DeFi but overwhelmed by technicalities.
Developers building AI-native dApps on Flow.
Analysts seeking real-time data via conversational interfaces.
It’s not just a project — it’s a peek into the future of blockchain interaction.

## 📎 Project Links
Hackathon Repo: https://github.com/Outblock/flow-chat-defi
MCP Server: https://github.com/Outblock/flow-mcp

## License

MIT
