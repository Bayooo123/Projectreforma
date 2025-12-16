
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email: string, token: string) => {
    // Construct the absolute link. 
    // In production, use NEXT_PUBLIC_APP_URL. For now, we assume standard localhost or provided env.
    const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${domain}/auth/reset-password?token=${token}`;

    await resend.emails.send({
        from: 'Reforma <onboarding@resend.dev>', // Use verified domain or default test domain
        to: email,
        subject: 'Reset your password',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e293b;">Reset Your Password</h1>
        <p style="color: #475569; font-size: 16px;">
          You requested a password reset. Click the button below to set a new password.
        </p>
        <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
          Reset Password
        </a>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `
    });
};
