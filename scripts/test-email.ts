import { mailService } from '../src/lib/services/mail/mail';
import { getVerificationEmail } from '../src/lib/services/mail/templates';

async function testEmail() {
    const args = process.argv.slice(2);
    const toEmail = args[0];

    if (!toEmail) {
        console.error('❌ Please provide an email address to send the test to.');
        console.error('Usage: npx tsx scripts/test-email.ts <your-email@example.com>');
        process.exit(1);
    }

    console.log(`⏳ Sending test email to: ${toEmail}...`);

    try {
        const result = await mailService.send({
            to: toEmail,
            subject: 'Reforma OS - Email configuration test',
            html: getVerificationEmail('User', 'https://reforma.ng'),
        });

        if (result.success) {
            console.log('✅ Email sent successfully!');
            console.log('Response from Resend:', JSON.stringify(result.data, null, 2));
        } else {
            console.error('❌ Failed to send email.');
            console.error(result.error);
        }
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

testEmail();
