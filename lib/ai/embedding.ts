import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings } from '@/lib/db/schema';

const MAX_TOKENS = 8192 - 100;

const embeddingModel = openai.embedding('text-embedding-ada-002');

const generateChunks = (input: string): string[] => {
    const sentences = input
        .trim()
        .split('.')
        .filter(Boolean)
        .map(s => s.trim() + '.');

    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        // Check if adding the next sentence would exceed MAX_TOKENS
        if ((currentChunk + sentence).length > MAX_TOKENS) {
            if (currentChunk) {
                chunks.push(currentChunk);
            }
            // If single sentence is too long, split it into smaller pieces
            if (sentence.length > MAX_TOKENS) {
                let i = 0;
                while (i < sentence.length) {
                    chunks.push(sentence.slice(i, i + MAX_TOKENS));
                    i += MAX_TOKENS;
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += sentence;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
};

export const generateEmbeddings = async (
    value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
    const chunks = generateChunks(value);
    const { embeddings } = await embedMany({
        model: embeddingModel,
        values: chunks,
    });
    return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
        model: embeddingModel,
        value: input,
    });
    return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
    const userQueryEmbedded = await generateEmbedding(userQuery);
    const similarity = sql<number>`1 - (${cosineDistance(
        embeddings.embedding,
        userQueryEmbedded,
    )})`;
    const similarGuides = await db
        .select({ name: embeddings.content, similarity })
        .from(embeddings)
        .where(gt(similarity, 0.5))
        .orderBy(t => desc(t.similarity))
        .limit(4);
    return similarGuides;
};