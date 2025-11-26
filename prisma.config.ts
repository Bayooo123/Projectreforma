import { defineConfig } from '@prisma/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        url: databaseUrl,
    },
});
