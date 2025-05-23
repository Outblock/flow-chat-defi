import { tool } from 'ai';
import { z } from 'zod';

export const getFlowBlockHeight = tool({
  description: 'Get the current block height of the Flow blockchain',
  parameters: z.object({}),
  execute: async () => {
    const response = await fetch(
      `https://rest-mainnet.onflow.org/v1/blocks?height=final`,
    );

    const blockHeight = await response.json();
    return blockHeight[0].header;
  },
});
