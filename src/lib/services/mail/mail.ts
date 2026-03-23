
import { Resend } from 'resend';
import { config } from '@/lib/config';

const resend = new Resend(config.RESEND_API_KEY);

interface SendMailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    from?: string;
}

/**
 * Interface for the mail service.
 * Allows switching providers (e.g., SES, SendGrid) in the future.
 */
class MailService {
    private defaultFrom = config.MAIL_FROM;

    async send(options: SendMailOptions) {
        const { to, subject, html, text, from, replyTo } = options;

        try {
            const data = await resend.emails.send({
                from: from || this.defaultFrom,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                text: text || this.stripHtml(html),
                replyTo: replyTo,
            });

            return { success: true, data };
        } catch (error) {
            console.error('[MailService] Error sending email:', error);
            return { success: false, error };
        }
    }

    /**
     * Simple HTML to Text fallback if text version isn't provided.
     */
    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>?/gm, '');
    }
}

export const mailService = new MailService();
