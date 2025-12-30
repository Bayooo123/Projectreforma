import nodemailer from 'nodemailer';

/**
 * Zoho Mail SMTP Configuration
 * 
 * Required environment variables:
 * - SMTP_HOST: smtp.zoho.com (or smtp.zoho.eu for EU)
 * - SMTP_PORT: 465 (SSL) or 587 (TLS)
 * - SMTP_USER: your-email@yourdomain.com
 * - SMTP_PASSWORD: your app-specific password
 * - SMTP_FROM_EMAIL: noreply@yourdomain.com (or same as SMTP_USER)
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

export async function sendInvitationEmail({
    to,
    workspaceName,
    inviterName,
    inviteLink,
    role,
}: InvitationEmailParams) {
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@reforma.app';
    const subject = `You've been invited to join ${workspaceName} on Reforma`;

    // TEST MODE: Skip actual email sending
    if (isTestMode) {
        console.log('📧 [TEST MODE] Email sending skipped - would have sent:');
        console.log({
            to,
            from: fromEmail,
            subject,
            workspaceName,
            inviterName,
            inviteLink,
            role,
        });
        console.log('💡 To enable real email sending, configure SMTP_USER and SMTP_PASSWORD in .env');
        console.log('   For Zoho: Use your Zoho email and app-specific password');

        // Return mock success response
        return {
            messageId: `test_${Date.now()}`,
            from: fromEmail,
            to,
        };
    }

    // PRODUCTION MODE: Send actual email via Zoho SMTP
    try {
        const transport = getTransporter();

        if (!transport) {
            throw new Error('SMTP transporter not initialized. Please configure SMTP credentials.');
        }

        const info = await transport.sendMail({
            from: `Reforma <${fromEmail}>`,
            to,
            subject,
            html: getInvitationEmailHTML({
                workspaceName,
                inviterName,
                inviteLink,
                role,
            }),
        });

        console.log('✅ Invitation email sent successfully:', { to, messageId: info.messageId });
        return info;
    } catch (error) {
        console.error('❌ Error sending invitation email:', error);
        throw error;
    }
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
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; text-align: center;">
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
                                        <a href="${inviteLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
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
