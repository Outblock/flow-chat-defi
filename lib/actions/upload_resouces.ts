import fs from 'fs/promises';
import path from 'path';
import { createResource } from './resources';

async function main() {
    const fileUri = process.argv[2];
    console.log('📄 File URI:', fileUri);
    if (!fileUri) {
        console.error('Usage: tsx lib/actions/upload_resouces.ts <file-path>');
        process.exit(1);
    }

    const absPath = path.resolve(fileUri);
    console.log('🔍 Reading file...');
    const rawBuffer = await fs.readFile(absPath);
    let content = rawBuffer.toString('utf-8');
    content = content
        .replace(/[\n\t]+/g, '\n') // Normalize line breaks and tabs
        .replace(/\u0000/g, '') // Remove null characters
        .replace(/[^\x20-\x7E\n]/g, ''); // Remove non-printable characters except newlines
    console.log('✅ File read successfully. Length:', content.length);

    // Split content into 0.5MB chunks
    const CHUNK_SIZE = 0.5 * 1024 * 1024; // 0.5MB in bytes
    const chunks = [];

    for (let i = 0; i < content.length; i += CHUNK_SIZE) {
        const chunk = content.slice(i, i + CHUNK_SIZE);
        chunks.push(chunk);
    }

    console.log(`🔪 Split content into ${chunks.length} chunks`);

    console.log('🚀 Uploading chunks and generating embeddings...');
    for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);
        const result = await createResource(chunks[i]);
        console.log(`Chunk ${i + 1} result:`, result);
    }

    console.log('✅ All chunks uploaded and embedded.');
    console.log('🎉 Done!');
    return 'Done!';
}

main().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});