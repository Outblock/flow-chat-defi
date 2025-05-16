import React from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface Token {
  contractAddress: string;
  logo: string;
  symbol: string;
  name: string;
  decimals: number;
  rawBalance: string;
  balance: string;
}

interface TokenListProps {
  data: string;
  address?: string;
}

const TokenList: React.FC<TokenListProps> = ({ data, address }) => {
  let tokens: Token[] = [];
  try {
    tokens = JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse token data:', e);
    return (
      <Card className="w-full" suppressHydrationWarning>
        <CardHeader className="space-y-1">
          <CardTitle>ERC20 Token List</CardTitle>
          {address && (
            <CardDescription className="font-mono text-sm break-all">
              {address}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-red-500 text-center text-lg">
            Failed to load token data
          </div>
        </CardContent>
        {address && (
          <CardFooter className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `https://evm.flowscan.io/address/${address}?tab=tokens_erc20`,
                  '_blank'
                )
              }
            >
              View on Flowscan
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  // Filter out tokens with zero balance
  const tokensWithBalance = tokens.filter((token) => token.balance !== '0');

  if (!tokensWithBalance.length) {
    return (
      <Card className="w-full" suppressHydrationWarning>
        <CardHeader className="space-y-1">
          <CardTitle>ERC20 Token List</CardTitle>
          {address && (
            <CardDescription className="font-mono text-sm break-all">
              {address}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-muted-foreground text-center text-lg font-medium">
            No ERC20 tokens found
          </div>
        </CardContent>
        {address && (
          <CardFooter className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `https://evm.flowscan.io/address/${address}?tab=tokens_erc20`,
                  '_blank'
                )
              }
            >
              View on Flowscan
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card className="w-full" suppressHydrationWarning>
      <CardHeader className="space-y-1">
        <CardTitle>ERC20 Token List</CardTitle>
        {address && (
          <CardDescription className="font-mono text-sm break-all">
            {address}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {tokensWithBalance.map((token) => (
              <div
                key={token.contractAddress}
                className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:bg-accent/5"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 relative">
                    <Image
                      src={token.logo}
                      alt={`${token.name} logo`}
                      fill
                      className="rounded-full object-contain ring-1 ring-border"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">
                      {token.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {token.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-lg tabular-nums">
                    {token.balance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      {address && (
        <CardFooter className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://evm.flowscan.io/address/${address}?tab=tokens_erc20`,
                '_blank'
              )
            }
          >
            View on Flowscan
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default TokenList;
