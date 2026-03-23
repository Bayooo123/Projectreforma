export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { loadSecrets } = await import('@/lib/services/secrets-manager');
        await loadSecrets();
        
        // After secrets are loaded, we can dynamically import the config to trigger validation
        // but since we want to handle the error gracefully or fail fast, we do it here.
        try {
            const { config } = await import('@/lib/config');
            console.log('✅ Configuration validated for', config.NODE_ENV);
        } catch (error) {
            console.error('❌ Configuration validation failed at startup');
            process.exit(1);
        }
    }
}
