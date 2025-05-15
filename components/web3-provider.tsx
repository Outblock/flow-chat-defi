'use client';

import { connectorsForWallets, getDefaultConfig,
  RainbowKitProvider,
  darkTheme } from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { mainnet, flowMainnet } from 'viem/chains';
import '@rainbow-me/rainbowkit/styles.css';

import { WagmiProvider } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { ReactNode, useState } from 'react';
const projectId = "4ce92501df1f39ff6e2edb1adb1ebcd9"
/* src/flowWallet.ts */ 
import { Wallet, getWalletConnectConnector } from '@rainbow-me/rainbowkit';

export interface MyWalletOptions {
  projectId: string;
}

const flowWallet = ({ projectId }: MyWalletOptions): Wallet => ({
  id: 'flow-wallet',
  name: 'Flow Wallet',
  rdns: 'com.flowfoundation.wallet',
  iconUrl: 'https://lilico.app/logo_mobile.png',
  iconBackground: '#41CC5D',
  downloadUrls: {
    android: 'https://play.google.com/store/apps/details?id=com.flowfoundation.wallet',
    ios: 'https://apps.apple.com/ca/app/flow-wallet-nfts-and-crypto/id6478996750',
    chrome: 'https://chromewebstore.google.com/detail/flow-wallet/hpclkefagolihohboafpheddmmgdffjm',
    qrCode: 'https://link.lilico.app',
  },
  mobile: {
    getUri: (uri: string) => `https://fcw-link.lilico.app/wc?uri=${encodeURIComponent(uri)}`,
  },
  qrCode: {
    getUri: (uri: string) => uri,
    instructions: {
      learnMoreUrl: 'https://wallet.flow.com',
      steps: [
        {
          description: 'We recommend putting Flow Wallet on your home screen for faster access to your wallet.',
          step: 'install',
          title: 'Open the Flow Wallet app',
        },
        {
          description: 'You can find the scan button on home page, a connection prompt will appear for you to connect your wallet.',
          step: 'scan',
          title: 'Tap the scan button',
        },
      ],
    },
  },
  extension: {
    instructions: {
      learnMoreUrl: 'https://wallet.flow.com',
      steps: [
        {
          description: 'We recommend pinning Flow Wallet to your taskbar for quicker access to your wallet.',
          step: 'install',
          title: 'Install the Flow Wallet extension',
        },
        {
          description: 'Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.',
          step: 'create',
          title: 'Create or Import a Wallet',
        },
        {
          description: 'Once you set up your wallet, click below to refresh the browser and load up the extension.',
          step: 'refresh',
          title: 'Refresh your browser',
        },
      ],
    },
  },
  createConnector: getWalletConnectConnector({ projectId }),
});


/*
We can leave this as is for the tutorial but it should be
replaced with your own project ID for production use.
*/


const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [flowWallet]
    },
  ],
  {
    appName: 'RainbowKit App',
    projectId,
  }
);

const config = createConfig({
  connectors,
  chains: [flowMainnet, mainnet],
  ssr: true,
  transports: {
    [flowMainnet.id]: http(),
    [mainnet.id]: http(),
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
