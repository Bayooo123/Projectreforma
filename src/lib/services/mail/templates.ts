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
      <p>Click the button below to set a new password. This link will expire in 15 minutes and can only be used once.</p>
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
