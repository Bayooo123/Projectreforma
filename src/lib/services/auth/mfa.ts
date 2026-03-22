/**
 * mfa.ts — TOTP Multi-Factor Authentication service
 *
 * Uses otplib for RFC 6238-compliant Time-based One-Time Password generation.
 * Secrets are stored in the User.mfaSecret column (should be encrypted at rest
 * via Supabase column encryption in production).
 *
 * Usage:
 *   const { secret, otpauthUri } = generateMfaSecret('user@example.com');
 *   const qrCodeDataUrl = await getMfaQrCode(otpauthUri);
 *   const valid = verifyMfaToken(secret, userSubmittedToken);
 */

import { generateSecret as generateOtpSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

/** App name shown in authenticator apps */
const APP_NAME = 'Reforma';

export interface MfaSetupResult {
    secret: string;
    otpauthUri: string;
}

/**
 * Generates a new TOTP secret and otpauth URI for a user.
 * Call this when the user initiates MFA setup.
 */
export function generateMfaSecret(userEmail: string): MfaSetupResult {
    const secret = generateOtpSecret({ length: 20 }); // 20-byte = 160-bit secret
    const otpauthUri = generateURI({ issuer: APP_NAME, label: userEmail, secret });
    return { secret, otpauthUri };
}

/**
 * Generates a QR code data URL from an otpauth URI.
 * The returned data URL can be used directly in an <img> tag.
 */
export async function getMfaQrCode(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri, {
        width: 256,
        margin: 2,
        color: { dark: '#121826', light: '#ffffff' },
    });
}

/**
 * Verifies a user-submitted TOTP token against the stored secret.
 * Returns true if the token is valid within the configured window.
 */
export function verifyMfaToken(secret: string, token: string): boolean {
    try {
        // window: 1 is equivalent to epochTolerance: 1 (accept 1 step before/after current step)
        const result = verifySync({ token, secret, epochTolerance: 1 });
        return Boolean((result as any).valid);
    } catch {
        return false;
    }
}

