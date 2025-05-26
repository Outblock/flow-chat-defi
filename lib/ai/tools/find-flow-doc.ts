import { tool } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '../embedding';

export const findFlowDoc = tool({
  description: `get information from the flow documentation to answer questions.`,
  parameters: z.object({
    question: z.string().describe('the users question'),
  }),
  execute: async ({ question }) => findRelevantContent(question),
});
