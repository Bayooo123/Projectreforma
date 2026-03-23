import { PrismaClient } from '@prisma/client';
import { config } from './config';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: config.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
        db: {
            url: config.DATABASE_URL,
        },
    },
});

if (config.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test database connection
export async function testDatabaseConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
