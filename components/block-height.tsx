import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "./ui/card";
import NumberFlow from "@number-flow/react";

const containerConfig = {
  damping: 15,
  mass: 1,
  stiffness: 200,
  type: "spring",
};

export const BlockHeightCard = ({ result }: { result: any }) => {
  const [blockHeight, setBlockHeight] = useState(result.height);
  const [time, setTime] = useState(result.timestamp);
  const controls = useAnimation();

  const fetchBlockHeight = async () => {
    const response = await fetch(
      "https://rest-mainnet.onflow.org/v1/blocks?height=final"
    );
    const data = await response.json();
    setBlockHeight(data[0].header.height);
    setTime(Date.now());
  };

  useEffect(() => {
    fetchBlockHeight();
    const interval = setInterval(fetchBlockHeight, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (blockHeight > 0) {
      controls.start({
        scale: [0, 1],
        opacity: [0, 1, 1, 0],
        transition: {
          ...containerConfig,
          times: [0, 0.3, 0.7, 1],
          duration: 2.5,
        },
      });
    }
  }, [blockHeight, controls]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 relative">
        <div className="flex flex-col items-center justify-center space-y-2">
          <h3 className="text-2xl font-bold text-foreground">Block Height</h3>
          <div className="relative h-14 flex items-center justify-center">
            <NumberFlow
              className="text-4xl font-mono text-green-600"
              value={blockHeight}
            />
          </div>
          <p className="text-sm text-gray-500">
            Last updated: {new Date(time).toLocaleTimeString()}
          </p>
        </div>
        {/* <motion.div
          initial={{
            width: "16px",
            height: "16px",
            opacity: 0,
            borderRadius: "50%",
          }}
          animate={{
            width: "max(100%, 100vw)",
            height: "max(100%, 100vh)",
            opacity: [0, 1.0, 0],
          }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 10,
            mass: 1,
            repeat: Infinity,
            repeatType: "loop",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500/50 border-5 border-green-500 "
        /> */}
      </CardContent>
    </Card>
  );
};
