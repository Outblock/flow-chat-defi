import { useState, useEffect } from 'react';
import {
  type BaseError,
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseEther, formatUnits, hexToBigInt, decodeAbiParameters } from 'viem';
import { Separator } from '@radix-ui/react-dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { useTransactionListenerContext } from '@/hooks/use-transaction-listener';
import { motion, AnimatePresence } from 'framer-motion';

const AddressLink = ({
  address,
  truncate,
}: {
  address: string;
  truncate?: boolean;
}) => {
  return (
    <a
      href={`https://evm.flowscan.io/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-neutral-100 font-mono text-xs hover:text-blue-400 transition-colors"
    >
      {truncate ? `${address.slice(0, 8)}...${address.slice(-8)}` : address}
    </a>
  );
};

export function TransferApproval(transactionObject: any) {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const { data: hash, error, isPending, sendTransactionAsync } =
    useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const { addTxHash } = useTransactionListenerContext();

  // Report txHash to listener context
  useEffect(() => {
    if (hash) {
      addTxHash(hash);
    }
  }, [hash, addTxHash]);

  // Extract calldata from transactionObject
  const text = transactionObject.transactionObject.content[0]?.text;
  const tx = JSON.parse(text);
  const to = tx.transactionRequest.to;
  const data = tx.transactionRequest.data;
  const tokenInfo = tx.tokenInfo;

  // ERC20 transfer selector: a9059cbb
  // data: 0xa9059cbb + 32 bytes (address) + 32 bytes (amount)
  let decodedRecipient = '';
  let decodedAmount = '';
  if (data && data.startsWith('0xa9059cbb')) {
    // Remove the selector (first 4 bytes = 8 hex chars after '0x')
    const paramsData = `0x${data.slice(10)}` as `0x${string}`;
    const [recipient, amount] = decodeAbiParameters(
      [
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      paramsData
    );

    decodedRecipient = recipient;
    try {
      decodedAmount = formatUnits(amount, tokenInfo.decimals);
    } catch {
      decodedAmount = amount.toString();
    }
  }

  const handleTransfer = async () => {
    if (!address) {
      openConnectModal?.();
      return;
    }

    try {
      await sendTransactionAsync({
        to: to,
        data: data,
      });
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setIsLoading(false);
    }

    setIsLoading(true);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <Card className="w-full border border-neutral-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            ERC20 Transfer Approval
          </CardTitle>
          <Separator className="bg-neutral-500 w-full h-px" />
        </CardHeader>
        <CardContent className="space-y-3 pb-1">
          <AnimatePresence mode="wait">
            {hash ? (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="flex flex-col items-center justify-center gap-6 py-12"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex items-center justify-center size-12">
                    <div className="absolute inset-0 animate-spin rounded-full border-y-2 border-green-500" />
                    <Avatar className="absolute inset-0 m-auto">
                      <AvatarImage src={tokenInfo.logo} className="size-10" />
                      <AvatarFallback>{tokenInfo.symbol}</AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-lg font-semibold text-neutral-100 mt-2">Waiting for transaction complete...</span>
                  <a
                    href={`https://evm.flowscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-mono text-xs mt-2 hover:underline"
                  >
                    {hash}
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="normal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                <div className="flex items-center gap-4 p-4 bg-neutral-900 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarImage src={tokenInfo.logo} className="size-10" />
                      <AvatarFallback>{tokenInfo.symbol}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-300">
                        {tokenInfo.name}
                      </span>
                      <AddressLink address={to} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-neutral-300 text-sm">From</span>
                        <Badge variant="secondary" className="text-xs">
                          my account
                        </Badge>
                      </div>
                    </div>
                    {address ? (
                      <div className="flex flex-col p-4 bg-neutral-900 rounded-lg">
                        <AddressLink address={address as `0x${string}`} truncate />
                      </div>
                    ) : (
                      <Button
                        onClick={openConnectModal}
                        variant="outline"
                        className="w-full"
                      >
                        Connect Wallet
                      </Button>
                    )}
                  </div>

                  <div className="flex-shrink-0 self-end mb-4">
                    <div className="bg-green-500 rounded-full p-1">
                      <svg
                        className="size-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12h14m-7-7l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1">
                    <span className="text-neutral-300 text-sm mb-2 block">To</span>
                    <div className="flex flex-col p-4 bg-neutral-900 rounded-lg">
                      <AddressLink address={decodedRecipient} truncate />
                    </div>
                  </div>
                </div>

                <span className="text-sm text-neutral-300">Amount</span>
                <div className="flex flex-col gap-1 p-3 bg-neutral-900 rounded-lg">
                  <span className="text-neutral-100 font-mono text-sm text-end">
                    {decodedAmount}
                  </span>
                </div>

                <div className="flex flex-col">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="calldata">
                      <AccordionTrigger className="font-sm text-neutral-300 hover:text-neutral-100">
                        Calldata
                      </AccordionTrigger>
                      <AccordionContent>
                        <span className="text-neutral-100 break-all font-mono text-sm bg-neutral-900 p-2 rounded block">
                          {data}
                        </span>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleTransfer}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Approve Transfer'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
