
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma'; // Assuming prisma instance export, otherwise will use global
import { nanoid } from 'nanoid';

// Standard UUID is better for reset tokens than nanoid for consistency with Auth.js
// but we will use nanoid for cleaner imports if uuid isn't there (it's not in package.json)
// Wait, checking package.json again... no 'uuid' in dependencies.
// 'nanoid' IS in dependencies. We will use nanoid.

export const generatePasswordResetToken = async (email: string) => {
    const token = nanoid();
    const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 Hour

    // Check if token exists for this email and delete it
    const existingToken = await prisma.verificationToken.findFirst({
        where: { identifier: email }
    });

    if (existingToken) {
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: existingToken.identifier,
                    token: existingToken.token
                }
            }
        });
    }

    const verificationToken = await prisma.verificationToken.create({
        data: {
            identifier: email,
            token,
            expires
        }
    });

    return verificationToken;
};
