import { prisma } from './prisma';

/**
 * Generates a unique 4-digit numeric lawyer token.
 * 
 * Flow:
 * 1. Generate a random 4-digit string.
 * 2. Check if it exists in the database.
 * 3. If it exists, recurse until a unique one is found.
 */
export async function generateUniqueLawyerToken(): Promise<string> {
    const token = Math.floor(1000 + Math.random() * 9000).toString();

    const existingUser = await prisma.user.findUnique({
        where: { lawyerToken: token },
    });

    if (existingUser) {
        return generateUniqueLawyerToken();
    }

    return token;
}
