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
import { AddressLink } from "./address-link";
import { ArrowDownIcon } from "lucide-react";

interface TokenInfo {
  contractAddress: string;
  logo: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface TokenInInfos {
  functionName: string;
  in: TokenInfo;
  out: TokenInfo;
  amountIn: string;
  amountOut: string;
  amountInWei: string;
  amountOutMin: string;
  path: string[];
  deadline: number;
  isETHIn: boolean;
  isETHOut: boolean;
}

interface TransactionRequest {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
}

interface PunchSwapData {
  transactionRequest: TransactionRequest;
  tokenInInfos: TokenInInfos;
  type: "punchswap_swap";
}

export function PunchSwap(result: any) {
  console.log("PunchSwap resulta ---->", result);

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
        tx.tokenInInfos.functionName === "approve"
          ? `I have approved ${inTokenInfo.symbol}. Transaction hash is ${hash}. Let's proceed with swap.`
          : `I have successfully swapped ${tx.tokenInInfos.amountIn} ${inTokenInfo.symbol} to ${tx.tokenInInfos.amountOut} ${outTokenInfo.symbol}. Transaction hash is ${hash}. Please check my balance.`
      );
    }
  }, [hash, addTxHash]);

  // Extract calldata from transactionObject
  const text = result.result.content[0]?.text;
  const tx = JSON.parse(text) as PunchSwapData;
  const to = tx.transactionRequest.to;
  const data = tx.transactionRequest.data;
  const inTokenInfo = tx.tokenInInfos.in;
  const outTokenInfo = tx.tokenInInfos.out;

  const handleTransfer = async () => {
    if (!address) {
      openConnectModal?.();
      return;
    }

    try {
      await sendTransactionAsync({
        to: to as `0x${string}`,
        data: data as `0x${string}`,
      });
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsLoading(false);
    }

    setIsLoading(true);
  };

  return (
    <div className="flex flex-col max-w-lg items-center justify-center p-6">
      <Card className="w-full border border-neutral-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {tx.tokenInInfos.functionName === "approve"
              ? "Token Approve"
              : "Token Swap Request"}
          </CardTitle>
        </CardHeader>
        <Separator className="bg-border w-full h-px" />
        <CardContent className="space-y-3 p-4">
          <AnimatePresence mode="wait">
            <motion.div className="space-y-">
              <div className="relative">
                <div className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent/50 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={inTokenInfo.logo}
                        alt={inTokenInfo.name}
                      />
                      <AvatarFallback>{inTokenInfo.symbol}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{inTokenInfo.name}</p>
                      <p className="text-xs text-neutral-400">
                        {inTokenInfo.symbol}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {tx.tokenInInfos.amountIn}
                  </p>
                </div>

                {tx.tokenInInfos.functionName !== "approve" && (
                  <>
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-3 z-10">
                      <div className="size-8 rounded-full border-2 bg-background shadow-md shadow-black/5 flex items-center justify-center">
                        <ArrowDownIcon className="size-4" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border rounded-lg p-3 mt-2 hover:bg-accent/50 transition-colors duration-200">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={outTokenInfo.logo}
                            alt={outTokenInfo.name}
                          />
                          <AvatarFallback>{outTokenInfo.symbol}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {outTokenInfo.name}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {outTokenInfo.symbol}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-neutral-400">Min</p>
                        <p className="text-sm font-medium">
                          {tx.tokenInInfos.amountOut}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="details">
                  <AccordionTrigger className="text-xs">
                    View Details
                  </AccordionTrigger>
                  <AccordionContent className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span>Function:</span>
                      <span className="text-neutral-100">
                        {tx.tokenInInfos.functionName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Path:</span>
                      <span className="text-neutral-100">
                        {tx.tokenInInfos.path.map((address, i) => (
                          <span key={address}>
                            <AddressLink address={address} truncate />
                            {i < tx.tokenInInfos.path.length - 1 ? " → " : ""}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deadline:</span>
                      <span className="text-neutral-100">
                        {new Date(
                          tx.tokenInInfos.deadline * 1000
                        ).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        })}
                      </span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
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
                {isLoading ? "Processing..." : "Approve"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
