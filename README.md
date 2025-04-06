# Porkfolio

A modern cross-chain portfolio management application powered by ZetaChain,
featuring sophisticated strategies for token rebalancing, AI-powered portfolio
analytics, and seamless cross-chain token management.

[Visit Porkfolio](https://porkfolio.xyz/) 🐷

## Features

- 💼 Cross-chain portfolio management powered by ZetaChain
- 🔄 Cross-chain token rebalancing across multiple EVM chains
- 🤖 AI-generated rebalancing strategies for optimal portfolio allocation
- 💰 Seamless deposits and withdrawals to/from ZetaChain
- 🎁 OINK universal token rewards for portfolio rebalancing
- 🚀 Price tracking using Pyth Network
- 📊 Interactive charts and analytics
- 🔒 Wallet integration with Dynamic Labs
- 🎨 Modern UI with Tailwind CSS and Radix UI components

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Tailwind CSS, Radix UI, Shadcn UI
- **State Management**: React Query
- **Blockchain**: ZetaChain, Dynamic Labs SDK, Wagmi, Viem
- **AI**: Anthropic Claude
- **Charts**: Recharts
- **Testing**: Jest
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Yarn package manager
- Web3 wallet (MetaMask or similar)

### Quick Start

1. Visit [porkfolio.xyz](https://porkfolio.xyz/) to get started
2. Connect your wallet
3. Start managing your cross-chain portfolio

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/yourusername/porkfolio.git
cd porkfolio
```

2. Install dependencies:

```bash
yarn install
```

3. Create a `.env.local` file in the root directory and add your environment
   variables:

```env
# Add your environment variables here
NEXT_PUBLIC_ZETACHAIN_RPC_URL=your_rpc_url
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_api_key
```

4. Start the development server:

```bash
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `yarn dev` - Start the development server
- `yarn build` - Build the application for production
- `yarn start` - Start the production server
- `yarn lint` - Run ESLint
- `yarn test` - Run Jest tests

## Project Structure

```
porkfolio/
├── app/             # Next.js app router pages
├── components/      # Reusable UI components
├── core/            # Core business logic
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and configurations
├── public/          # Static assets
├── store/           # State management
└── styles/          # Global styles and Tailwind config
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for
details.
