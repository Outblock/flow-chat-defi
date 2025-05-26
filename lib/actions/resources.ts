'use server';

import {
    // NewResourceParams,
    // insertResourceSchema,
    resources,
    embeddings as embeddingsTable
} from '@/lib/db/schema';
import { db } from '@/lib/db';
import { generateEmbeddings } from '../ai/embedding';

export const createResource = async (content: string) => {
    try {
        console.log('[createResource] Parsing input...');
        // const { content } = insertResourceSchema.parse(input);

        console.log('[createResource] Inserting resource...');
        const [resource] = await db
            .insert(resources)
            .values({ content, createdAt: new Date(), updatedAt: new Date() })
            .returning();

        console.log('[createResource] Generating embeddings...');
        const embeddings = await generateEmbeddings(content);

        console.log('[createResource] Inserting embeddings...');
        await db.insert(embeddingsTable).values(
            embeddings.map(embedding => ({
                resourceId: resource.id,
                ...embedding,
            })),
        );

        console.log('[createResource] Done.');
        return 'Resource successfully created and embedded.';
    } catch (error) {
        console.error('[createResource] Error:', error);
        return error instanceof Error && error.message.length > 0
            ? error.message
            : 'Error, please try again.';
    }
};