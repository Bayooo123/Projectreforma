import { config } from '@/lib/config';

interface EmailTemplateData {
    title: string;
    previewTextText: string;
    content: string;
    ctaText?: string;
    ctaUrl?: string;
}

const sharedLayout = (data: EmailTemplateData) => {
    const appUrl = config.NEXT_PUBLIC_APP_URL;
    const logoUrl = `${appUrl}/logos/reforma-logo-pillar.png`;
    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>${data.title}</title>
  <style>
    body {
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: none;
    }
    .wrapper {
      background-color: #f1f5f9;
      width: 100%;
      padding: 40px 0;
    }
    .outer {
      margin: 0 auto;
      max-width: 580px;
    }
    .email-header {
      background-color: #0f172a;
      border-radius: 8px 8px 0 0;
      padding: 24px 40px;
      text-align: center;
    }
    .email-header img {
      height: 38px;
      width: auto;
      display: inline-block;
    }
    .container {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 3px solid #0d9488;
      border-radius: 0 0 8px 8px;
      padding: 36px 40px 32px;
    }
    h1 {
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 20px;
    }
    p {
      color: #475569;
      font-size: 15px;
      line-height: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .cta-container {
      margin-top: 28px;
      margin-bottom: 28px;
      text-align: center;
    }
    .button {
      background-color: #0d9488;
      border-radius: 6px;
      color: #ffffff !important;
      display: inline-block;
      font-size: 15px;
      font-weight: 600;
      padding: 13px 30px;
      text-decoration: none;
      letter-spacing: 0.01em;
    }
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0 20px;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      padding: 0 16px;
    }
    .footer p {
      color: #94a3b8;
      font-size: 12px;
      line-height: 20px;
      margin: 0 0 2px;
    }
    .footer .brand {
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="outer">

      <div class="email-header">
        <img src="${logoUrl}" alt="Reforma" />
      </div>

      <div class="container">
        <h1>${data.title}</h1>
        ${data.content}

        ${data.ctaText && data.ctaUrl ? `
        <div class="cta-container">
          <a href="${data.ctaUrl}" class="button">${data.ctaText}</a>
        </div>
        ` : ''}

        <hr class="divider" />
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">
          If you have any questions, reply to this email or contact our support team.
        </p>
      </div>

      <div class="footer">
        <p class="brand">Reforma</p>
        <p>Built by <strong>Reforma Digital Solutions</strong></p>
        <p>&copy; ${year} Reforma Digital Solutions. All rights reserved.</p>
      </div>

    </div>
  </div>
</body>
</html>`;
};

export const getVerificationEmail = (name: string, url: string) => {
    return sharedLayout({
        title: 'Verify your email',
        previewTextText: 'Confirm your account on Reforma',
        content: `
      <p>Hello ${name},</p>
      <p>Thank you for signing up for Reforma. Please verify your email address to complete your account setup and access your workspace.</p>
      <p>This link will expire in 30 minutes.</p>
    `,
        ctaText: 'Verify Email Address',
        ctaUrl: url
    });
};

export const getPasswordResetEmail = (url: string) => {
    return sharedLayout({
        title: 'Reset your password',
        previewTextText: 'Securely reset your Reforma password',
        content: `
      <p>We received a request to reset your password for your Reforma account.</p>
      <p>Click the button below to set a new password. This link will expire in 1 hour and can only be used once.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
        ctaText: 'Reset Password',
        ctaUrl: url
    });
};

export const getGuestWelcomeEmail = (guestName: string, workspaceName: string, designation: string, setPasswordUrl: string) => {
    return sharedLayout({
        title: `You've been added to ${workspaceName}`,
        previewTextText: `Your guest access to ${workspaceName} on Reforma is ready`,
        content: `
      <p>Hello ${guestName},</p>
      <p>You've been added as a <strong>${designation}</strong> to the <strong>${workspaceName}</strong> workspace on Reforma — a secure legal practice management platform.</p>
      <p>To get started, click the button below to set your password and sign in. This link is valid for <strong>24 hours</strong>.</p>
      <p style="color: #94a3b8; font-size: 14px;">As a guest, you'll have view-only access to the briefs that have been shared with you.</p>
    `,
        ctaText: 'Set Password & Sign In',
        ctaUrl: setPasswordUrl,
    });
};

export const getWorkspaceInviteEmail = (workspaceName: string, inviterName: string, role: string, url: string) => {
    return sharedLayout({
        title: `Invite to join ${workspaceName}`,
        previewTextText: `${inviterName} invited you to join ${workspaceName} on Reforma`,
        content: `
      <p>${inviterName} has invited you to join the <strong>${workspaceName}</strong> workspace on Reforma as a <strong>${role}</strong>.</p>
      <p>Reforma is a secure operating system built for legal professionals.</p>
      <p>Click the button below to accept the invitation and securely access the workspace.</p>
    `,
        ctaText: 'Accept Invitation',
        ctaUrl: url
    });
};

export const getFirmOwnerWelcomeEmail = (name: string, firmName: string, firmCode: string, verifyUrl: string) => {
    const appUrl = config.NEXT_PUBLIC_APP_URL;
    return sharedLayout({
        title: `Welcome to Reforma, ${name.split(' ')[0]}`,
        previewTextText: `${firmName} is now live on Reforma — here's how to get started`,
        content: `
      <p>Hi ${name.split(' ')[0]},</p>
      <p>Your firm <strong>${firmName}</strong> is now set up on Reforma. You're one of the first to bring your practice onto a platform built specifically for how Nigerian legal professionals work.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em;">Your Firm Code</p>
            <p style="margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: 0.15em;">${firmCode}</p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #64748b;">Share this with your team so they can join your workspace.</p>
          </td>
        </tr>
      </table>

      <p style="font-weight: 600; color: #0f172a; margin-bottom: 8px;">Get started in three steps:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 6px 0;">
            <span style="display: inline-block; width: 22px; height: 22px; background: #0d9488; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px; margin-right: 10px; vertical-align: middle;">1</span>
            <span style="color: #475569; vertical-align: middle;">Verify your email address using the button below</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">
            <span style="display: inline-block; width: 22px; height: 22px; background: #0d9488; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px; margin-right: 10px; vertical-align: middle;">2</span>
            <span style="color: #475569; vertical-align: middle;">Invite your team from the Settings page</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">
            <span style="display: inline-block; width: 22px; height: 22px; background: #0d9488; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px; margin-right: 10px; vertical-align: middle;">3</span>
            <span style="color: #475569; vertical-align: middle;">Create your first brief and start managing matters</span>
          </td>
        </tr>
      </table>

      <p style="margin-top: 20px; font-size: 13px; color: #94a3b8;">
        Need help getting started? Reply to this email — we read every message.
      </p>
    `,
        ctaText: 'Verify Email & Sign In',
        ctaUrl: verifyUrl,
    });
};

export const getMemberWelcomeEmail = (
    name: string,
    workspaceName: string,
    role: string,
    loginUrl: string,
    verifyUrl?: string,
) => {
    return sharedLayout({
        title: `You're in — Welcome to ${workspaceName}`,
        previewTextText: `You've joined ${workspaceName} on Reforma as ${role}`,
        content: `
      <p>Hi ${name.split(' ')[0]},</p>
      <p>You've officially joined <strong>${workspaceName}</strong> on Reforma as a <strong>${role}</strong>.</p>

      <p style="font-weight: 600; color: #0f172a; margin-bottom: 8px;">What you can do on Reforma:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
        <tr><td style="padding: 5px 0; color: #475569;">
          <span style="color: #0d9488; margin-right: 8px;">&#10003;</span> View and collaborate on briefs and case matters
        </td></tr>
        <tr><td style="padding: 5px 0; color: #475569;">
          <span style="color: #0d9488; margin-right: 8px;">&#10003;</span> Track timelines, correspondence, and documents
        </td></tr>
        <tr><td style="padding: 5px 0; color: #475569;">
          <span style="color: #0d9488; margin-right: 8px;">&#10003;</span> Use the AI assistant to search across your firm's matters
        </td></tr>
        <tr><td style="padding: 5px 0; color: #475569;">
          <span style="color: #0d9488; margin-right: 8px;">&#10003;</span> Manage client communications from a single workspace
        </td></tr>
      </table>

      ${verifyUrl ? `
      <p style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; font-size: 14px; color: #92400e; margin-bottom: 0;">
        <strong>One more step:</strong> Please verify your email address by clicking the button below before signing in.
      </p>
      ` : ''}
    `,
        ctaText: verifyUrl ? 'Verify Email & Get Started' : 'Sign In to Reforma',
        ctaUrl: verifyUrl ?? loginUrl,
    });
};
