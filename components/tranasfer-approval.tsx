import { useState, useEffect } from "react";
import {
  type BaseError,
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  parseEther,
  formatUnits,
  hexToBigInt,
  decodeAbiParameters,
} from "viem";
import { Separator } from "@radix-ui/react-dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useTransactionListenerContext } from "@/hooks/use-transaction-listener";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

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
      className="text-foreground font-mono text-xs hover:text-primary transition-colors"
    >
      {truncate ? `${address.slice(0, 8)}...${address.slice(-8)}` : address}
    </a>
  );
};

export function TransferApproval(transactionObject: any) {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const {
    data: hash,
    error,
    isPending,
    sendTransactionAsync,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const { addTxHash } = useTransactionListenerContext();

  // Report txHash to listener context
  useEffect(() => {
    if (hash) {
      addTxHash(
        hash,
        "I have successfully transferred " +
          decodedAmount +
          " " +
          tokenInfo.symbol +
          " to " +
          to +
          ".\n\nMy transaction hash is " +
          hash +
          "." +
          "\n\n" +
          "Check my new balance of " +
          tokenInfo.symbol
      );
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
  let decodedRecipient = "";
  let decodedAmount = "";
  if (data && data.startsWith("0xa9059cbb")) {
    // Remove the selector (first 4 bytes = 8 hex chars after '0x')
    const paramsData = `0x${data.slice(10)}` as `0x${string}`;
    const [recipient, amount] = decodeAbiParameters(
      [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
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
      console.error("Transaction failed:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }

    setIsLoading(true);
  };

  return (
    <div className="flex flex-col max-w-lg items-center justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            ERC20 Transfer Approval
          </CardTitle>
        </CardHeader>
        <Separator className="bg-border w-full h-px" />
        <CardContent className="space-y-3 p-4">
          <AnimatePresence mode="wait">
            {hash ? (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex flex-col items-center justify-center gap-6 py-12"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex items-center justify-center size-12">
                    {isConfirmed ? (
                      <div className="absolute inset-0 rounded-full border-2 border-primary flex items-center justify-center">
                        <svg
                          className="size-6 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="absolute inset-0 animate-spin rounded-full border-y-2 border-primary" />
                    )}
                    <Avatar className="absolute inset-0 m-auto">
                      <AvatarImage src={tokenInfo.logo} className="size-10" />
                      <AvatarFallback>{tokenInfo.symbol}</AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-lg font-semibold mt-2">
                    {isConfirmed
                      ? "Transaction completed!"
                      : "Waiting for transaction complete..."}
                  </span>
                  <a
                    href={`https://evm.flowscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-mono text-xs mt-2 hover:underline"
                  >
                    {hash.slice(0, 10)}...{hash.slice(-10)}
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="normal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-muted-foreground text-sm">
                          From
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          My Account
                        </Badge>
                      </div>
                    </div>
                    {address ? (
                      <div className="flex flex-col p-4 bg-muted rounded-lg">
                        <AddressLink
                          address={address as `0x${string}`}
                          truncate
                        />
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

                  <div className="size-8 rounded-full border-2 bg-background shadow-md shadow-black/5 flex items-center justify-center mt-6">
                    <ArrowRightIcon className="size-4" />
                  </div>

                  <div className="flex-1">
                    <span className="text-muted-foreground text-sm mb-2 block">
                      To
                    </span>
                    <div className="flex flex-col p-4 bg-muted rounded-lg">
                      <AddressLink address={decodedRecipient} truncate />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-muted-foreground text-sm mb-2 block">
                    Amount
                  </span>
                  <div className="flex items-center gap-4 p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={tokenInfo.logo} className="size-9" />
                        <AvatarFallback>{tokenInfo.symbol}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">
                          {tokenInfo.name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {tokenInfo.symbol}
                        </span>
                      </div>
                    </div>

                    <span className="font-bold text-lg text-end flex-1">
                      {decodedAmount}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="calldata">
                      <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground">
                        Calldata
                      </AccordionTrigger>
                      <AccordionContent>
                        <span className="break-all font-mono text-sm bg-muted p-2 rounded block">
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
        {!hash && (
          <>
            <Separator className="bg-border w-full h-px" />
            <CardFooter className="p-4">
              <Button
                onClick={handleTransfer}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Processing..." : "Approve Transfer"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
