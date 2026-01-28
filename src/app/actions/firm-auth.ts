'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const FirmLoginSchema = z.object({
    firmCode: z.string().min(1, 'Firm code is required'),
    firmPassword: z.string().min(1, 'Firm password is required'),
});

export type FirmLoginState = {
    errors?: {
        firmCode?: string[];
        firmPassword?: string[];
        name?: string[];
        email?: string[];
        password?: string[];
        phone?: string[];
        designation?: string[];
        _form?: string[];
    };
    success?: boolean;
    firmId?: string;
    firmName?: string;
};

export async function validateFirmCredentials(
    prevState: FirmLoginState,
    formData: FormData
): Promise<FirmLoginState> {
    const validatedFields = FirmLoginSchema.safeParse({
        firmCode: formData.get('firmCode'),
        firmPassword: formData.get('firmPassword'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { firmCode, firmPassword } = validatedFields.data;

    try {
        const workspace = await prisma.workspace.findUnique({
            // @ts-ignore
            where: { firmCode },
        });

        // @ts-ignore
        if (!workspace || !workspace.joinPassword) {
            return {
                errors: {
                    _form: ['Invalid firm code or password'],
                },
            };
        }

        // @ts-ignore
        const passwordsMatch = await bcrypt.compare(firmPassword, workspace.joinPassword);

        if (!passwordsMatch) {
            return {
                errors: {
                    _form: ['Invalid firm code or password'],
                },
            };
        }

        // Return success but don't redirect yet - let client handle query params
        return {
            success: true,
            firmId: workspace.id,
            firmName: workspace.name,
        };
    } catch (error) {
        console.error('Firm login error:', error);
        return {
            errors: {
                _form: ['Something went wrong. Please try again.'],
            },
        };
    }
}

const RegisterMemberSchema = z.object({
    firmId: z.string(),
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    designation: z.string().min(1, 'Designation is required'),
});

export async function registerMember(
    prevState: FirmLoginState,
    formData: FormData
): Promise<FirmLoginState> {
    const validatedFields = RegisterMemberSchema.safeParse({
        firmId: formData.get('firmId'),
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        designation: formData.get('designation'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { firmId, name, email, password, phone, designation } = validatedFields.data;

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return {
                errors: {
                    _form: ['User with this email already exists.'],
                },
            };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction: Create User -> Create WorkspaceMember
        await prisma.$transaction(async (tx) => {
            const { generateUniqueLawyerToken } = await import('@/lib/lawyer-tokens');
            const lawyerToken = await generateUniqueLawyerToken();

            const newUser = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    phone: phone || null,
                    lawyerToken,
                },
            });

            await tx.workspaceMember.create({
                // @ts-ignore
                data: {
                    userId: newUser.id,
                    workspaceId: firmId,
                    role: 'staff',
                    designation,
                    status: 'pending', // Pending approval
                },
            });
        });

        return {
            success: true,
        };
    } catch (error) {
        console.error('Registration error:', error);
        return {
            errors: {
                _form: ['Failed to create account. Please try again.'],
            },
        };
    }
}
