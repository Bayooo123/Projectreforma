import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Fetches secrets from AWS Secrets Manager and populates process.env.
 * This should be called once during application startup (e.g., in instrumentation.ts).
 */
export async function loadSecrets() {
    if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Running in development mode, skipping remote secrets fetch.');
        return;
    }

    const secretName = process.env.AWS_SECRET_NAME;
    if (!secretName) {
        console.warn('⚠️ AWS_SECRET_NAME not defined. Skipping remote secrets fetch.');
        return;
    }

    try {
        console.log(`📡 Fetching secrets from AWS Secrets Manager: ${secretName}`);
        const response = await client.send(
            new GetSecretValueCommand({
                SecretId: secretName,
                VersionStage: "AWSCURRENT",
            })
        );

        if (response.SecretString) {
            const secrets = JSON.parse(response.SecretString);
            Object.entries(secrets).forEach(([key, value]) => {
                process.env[key] = value as string;
            });
            console.log('✅ Secrets loaded and environment populated.');
        }
    } catch (error) {
        console.error('❌ Failed to load secrets from AWS:', error);
        // In production, this should probably be a fatal error
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Fatal: Could not load production secrets');
        }
    }
}
