
import { prisma } from '@/lib/prisma'; // Assuming prisma instance export, otherwise will use global
import { nanoid } from 'nanoid';

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
