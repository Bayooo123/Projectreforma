'use server';

import { z } from 'zod';

const WaitlistSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    firmName: z.string().min(2, 'Firm name must be at least 2 characters').optional(),
    market: z.enum(['US', 'UK', 'SA', 'Other']).optional(),
});

export async function joinWaitlist(formData: FormData) {
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const firmName = formData.get('firmName') as string;
    const market = formData.get('market') as string;

    const validatedFields = WaitlistSchema.safeParse({
        email,
        name: name || undefined,
        firmName: firmName || undefined,
        market: market || undefined,
    });

    if (!validatedFields.success) {
        return {
            error: validatedFields.error.flatten().fieldErrors,
        };
    }

    // Mocking persistence for now as per implementation plan
    console.log('Waitlist submission:', validatedFields.data);

    // In a real scenario, we would save this to the database
    // await prisma.waitlist.create({ data: validatedFields.data });

    // Simulate a bit of delay for premium feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
        success: true,
        message: "You've been added to the waitlist. We'll be in touch soon.",
    };
}
