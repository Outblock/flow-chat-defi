// import { Toaster } from 'sonner';
// import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from 'next/font/google';
// import { ThemeProvider } from '@/components/theme-provider';

// import './globals.css';
// import { SessionProvider } from 'next-auth/react';
// import { config } from '../components/config'
// import '@rainbow-me/rainbowkit/styles.css';
// import {
//   getDefaultConfig,
//   RainbowKitProvider,
//   darkTheme
// } from '@rainbow-me/rainbowkit';
// import { WagmiProvider } from 'wagmi';
// import {
//   mainnet,
//   polygon,
//   optimism,
//   arbitrum,
//   base,
// } from 'wagmi/chains';
// import {
//   QueryClientProvider,
//   QueryClient,
// } from "@tanstack/react-query";
// const flowPreviewnet = {
//   id: 646,
//   name: 'Flow Previewnet',
//   nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
//   rpcUrls: {
//     default: {
//       http: ['https://previewnet.evm.nodes.onflow.org'],
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: 'FlowDiver',
//       url: 'https://previewnet.flowdiver.io',
//       apiUrl: 'https://previewnet.flowdiver.io/api',
//     },
//   },
//   contracts: {},
// }

// const client = new QueryClient();

// export const metadata: Metadata = {
//   metadataBase: new URL('https://chat.vercel.ai'),
//   title: 'Next.js Chatbot Template',
//   description: 'Next.js chatbot template using the AI SDK.',
// };

// export const viewport = {
//   maximumScale: 1, // Disable auto-zoom on mobile Safari
// };

// const geist = Geist({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-geist',
// });

// const geistMono = Geist_Mono({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-geist-mono',
// });

// const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
// const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
// const THEME_COLOR_SCRIPT = `\
// (function() {
//   var html = document.documentElement;
//   var meta = document.querySelector('meta[name="theme-color"]');
//   if (!meta) {
//     meta = document.createElement('meta');
//     meta.setAttribute('name', 'theme-color');
//     document.head.appendChild(meta);
//   }
//   function updateThemeColor() {
//     var isDark = html.classList.contains('dark');
//     meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
//   }
//   var observer = new MutationObserver(updateThemeColor);
//   observer.observe(html, { attributes: true, attributeFilter: ['class'] });
//   updateThemeColor();
// })();`;

// export default async function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <WagmiProvider config={config}>
//         <QueryClientProvider client={client}>
//           <RainbowKitProvider>
//     <html
//       lang="en"
//       // `next-themes` injects an extra classname to the body element to avoid
//       // visual flicker before hydration. Hence the `suppressHydrationWarning`
//       // prop is necessary to avoid the React hydration mismatch warning.
//       // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
//       suppressHydrationWarning
//       className={`${geist.variable} ${geistMono.variable}`}
//     >
//       <head>
//         <script
//           dangerouslySetInnerHTML={{
//             __html: THEME_COLOR_SCRIPT,
//           }}
//         />
//       </head>
//       <body className="antialiased">
//         <ThemeProvider
//           attribute="class"
//           defaultTheme="system"
//           enableSystem
//           disableTransitionOnChange
//         >
//           <Toaster position="top-center" />
//           <SessionProvider>{children}</SessionProvider>
//         </ThemeProvider>
//       </body>
//     </html>
//     </RainbowKitProvider>
//         </QueryClientProvider>
//       </WagmiProvider>
//   );
// }

import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Web3Provider } from '@/components/web3-provider';
import './globals.css';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'Next.js Chatbot Template',
  description: 'Next.js chatbot template using the AI SDK.',
};

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          <SessionProvider>
            <Web3Provider>
              {children}
            </Web3Provider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
