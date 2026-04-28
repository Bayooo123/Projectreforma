
interface EmailTemplateData {
    title: string;
    previewTextText: string;
    content: string;
    ctaText?: string;
    ctaUrl?: string;
}

/**
 * Shared layout for all transactional emails.
 * Follows "minimal, formal, and mobile-responsive" requirements.
 */
const sharedLayout = (data: EmailTemplateData) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>${data.title}</title>
  <style>
    body {
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: none;
    }
    .wrapper {
      background-color: #f8fafc;
      width: 100%;
      padding: 40px 0;
    }
    .container {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin: 0 auto;
      max-width: 580px;
      padding: 40px;
    }
    h1 {
      color: #0f172a;
      font-size: 24px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 24px;
    }
    p {
      color: #475569;
      font-size: 16px;
      line-height: 24px;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .cta-container {
      margin-top: 32px;
      margin-bottom: 32px;
      text-align: center;
    }
    .button {
      background-color: #121826;
      border-radius: 6px;
      color: #ffffff !important;
      display: inline-block;
      font-size: 16px;
      font-weight: 600;
      padding: 12px 24px;
      text-decoration: none;
    }
    .footer {
      color: #94a3b8;
      font-size: 12px;
      margin-top: 32px;
      text-align: center;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <h1>${data.title}</h1>
      ${data.content}
      
      ${data.ctaText && data.ctaUrl ? `
      <div class="cta-container">
        <a href="${data.ctaUrl}" class="button">${data.ctaText}</a>
      </div>
      ` : ''}
      
      <p style="color: #64748b; font-size: 14px;">
        If you have any questions, please reply to this email or contact support.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Reforma. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

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
