import crypto from 'crypto';
import { config } from '@/lib/config';

async function getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${config.MONNIFY_API_KEY}:${config.MONNIFY_SECRET_KEY}`).toString('base64');
    const res = await fetch(`${config.MONNIFY_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    });
    const data = await res.json();
    if (!data.requestSuccessful) {
        throw new Error(`Monnify auth failed: ${data.responseMessage}`);
    }
    return data.responseBody.accessToken;
}

export interface MonnifyTransaction {
    transactionReference: string;
    checkoutUrl: string;
    paymentReference: string;
}

export async function initializeTransaction(params: {
    amount: number;
    customerName: string;
    customerEmail: string;
    paymentReference: string;
    description: string;
    redirectUrl: string;
}): Promise<MonnifyTransaction> {
    const token = await getAccessToken();
    const res = await fetch(`${config.MONNIFY_BASE_URL}/api/v1/merchant/transactions/init-transaction`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: params.amount,
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            paymentReference: params.paymentReference,
            paymentDescription: params.description,
            currencyCode: 'NGN',
            contractCode: config.MONNIFY_CONTRACT_CODE,
            redirectUrl: params.redirectUrl,
            paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'],
        }),
    });
    const data = await res.json();
    if (!data.requestSuccessful) {
        throw new Error(`Monnify init failed: ${data.responseMessage}`);
    }
    return data.responseBody;
}

export async function verifyTransaction(transactionReference: string) {
    const token = await getAccessToken();
    const encoded = encodeURIComponent(transactionReference);
    const res = await fetch(`${config.MONNIFY_BASE_URL}/api/v2/transactions/${encoded}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
    });
    const data = await res.json();
    if (!data.requestSuccessful) {
        throw new Error(`Monnify verify failed: ${data.responseMessage}`);
    }
    return data.responseBody;
}

export function verifyWebhookHash(payload: {
    paymentReference: string;
    amountPaid: number;
    paidOn: string;
    transactionReference: string;
    transactionHash: string;
}): boolean {
    if (!config.MONNIFY_SECRET_KEY) return false;
    const hashString = `${payload.paymentReference}|${payload.amountPaid}|${payload.paidOn}|${payload.transactionReference}`;
    const computed = crypto
        .createHmac('sha512', config.MONNIFY_SECRET_KEY)
        .update(hashString)
        .digest('hex');
    return computed === payload.transactionHash;
}
