import nodemailer from 'nodemailer';

/**
 * Zoho Mail SMTP Configuration
 */

// Test mode flag - true when SMTP credentials are not configured
const isTestMode = !process.env.SMTP_USER || !process.env.SMTP_PASSWORD;

// Create reusable transporter (lazy initialized)
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    if (!transporter && !isTestMode) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.zoho.com',
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: (process.env.SMTP_PORT || '465') === '465', // true for 465, false for 587
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }
    return transporter;
}

interface InvitationEmailParams {
    to: string;
    workspaceName: string;
    inviterName: string;
    inviteLink: string;
    role: string;
}

interface PasswordResetEmailParams {
    to: string;
    resetLink: string;
}

export async function sendInvitationEmail({
    to,
    workspaceName,
    inviterName,
    inviteLink,
    role,
}: InvitationEmailParams) {
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'info@reforma.ng';
    const subject = `You've been invited to join ${workspaceName} on Reforma`;

    if (isTestMode) {
        console.log('📧 [TEST MODE] Email sending skipped - would have sent:');
        console.log({ to, from: fromEmail, subject, workspaceName, inviterName, inviteLink, role });
        return { messageId: `test_${Date.now()}`, from: fromEmail, to };
    }

    try {
        const transport = getTransporter();
        if (!transport) throw new Error('SMTP transporter not initialized.');

        const info = await transport.sendMail({
            from: `Reforma <${fromEmail}>`,
            to,
            subject,
            html: getInvitationEmailHTML({ workspaceName, inviterName, inviteLink, role }),
        });

        console.log('✅ Invitation email sent successfully:', { to, messageId: info.messageId });
        return info;
    } catch (error) {
        console.error('❌ Error sending invitation email:', error);
        throw error;
    }
}

export async function sendPasswordResetEmail({ to, resetLink }: PasswordResetEmailParams) {
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'info@reforma.ng';
    const subject = 'Reset your password - Reforma';

    if (isTestMode) {
        console.log('📧 [TEST MODE] Password Reset Email skipped:');
        console.log({ to, from: fromEmail, subject, resetLink });
        return { messageId: `test_reset_${Date.now()}`, from: fromEmail, to };
    }

    try {
        const transport = getTransporter();
        if (!transport) throw new Error('SMTP transporter not initialized');

        const info = await transport.sendMail({
            from: `Reforma <${fromEmail}>`,
            to,
            subject,
            html: getPasswordResetHTML(resetLink),
        });

        console.log('✅ Password reset email sent:', { to, messageId: info.messageId });
        return info;
    } catch (error) {
        console.error('❌ Error sending reset email:', error);
        throw error;
    }
}

function getPasswordResetHTML(resetLink: string) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Reforma</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                                Reset Your Password
                            </h2>
                            
                            <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                You recently requested to reset your password for your Reforma account. Click the button below to proceed.
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: #14B8A6; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Alternatively, you can copy and paste this link into your browser:<br>
                                <a href="${resetLink}" style="color: #14B8A6; word-break: break-all;">${resetLink}</a>
                            </p>
                            
                            <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                                This link will expire shortly. If you did not request a password reset, please ignore this email or contact support if you have concerns.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                                © ${new Date().getFullYear()} Reforma. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

function getInvitationEmailHTML({
    workspaceName,
    inviterName,
    inviteLink,
    role,
}: Omit<InvitationEmailParams, 'to'>) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to ${workspaceName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); padding: 40px 40px 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Reforma</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                                You've been invited!
                            </h2>
                            
                            <p style="margin: 0 0 24px 0; color: #666; font-size: 16px; line-height: 1.6;">
                                <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on Reforma as a <strong>${role}</strong>.
                            </p>
                            
                            <p style="margin: 0 0 32px 0; color: #666; font-size: 16px; line-height: 1.6;">
                                Reforma is a modern legal practice management platform that helps law firms streamline their operations, manage cases, and collaborate effectively.
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${inviteLink}" style="display: inline-block; padding: 14px 32px; background: #14B8A6; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0 0 0; color: #999; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link into your browser:<br>
                                <a href="${inviteLink}" style="color: #667eea; word-break: break-all;">${inviteLink}</a>
                            </p>
                            
                            <p style="margin: 24px 0 0 0; color: #999; font-size: 13px; line-height: 1.6;">
                                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #999; font-size: 13px;">
                                © ${new Date().getFullYear()} Reforma. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
