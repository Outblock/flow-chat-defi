import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from 'dotenv';

config({
    path: '.env.local',
});

const client = postgres(process.env.POSTGRES_URL!,  { max: 1 });
export const db = drizzle(client);