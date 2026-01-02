/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: 'var(--background)',
                surface: 'var(--surface)',
                'surface-subtle': 'var(--surface-subtle)',
                border: 'var(--border)',
                primary: 'var(--primary)',
                'primary-hover': 'var(--primary-hover)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-tertiary': 'var(--text-tertiary)',
                tertiary: 'var(--text-tertiary)',
                secondary: 'var(--text-secondary)',
                'teal-bg': 'var(--teal-bg)',
                'teal-text': 'var(--teal-text)',
                'hover-bg': 'var(--hover-bg)',
                success: 'var(--success)',
                'success-bg': 'var(--success-bg)',
                warning: 'var(--warning)',
                'warning-bg': 'var(--warning-bg)',
                danger: 'var(--danger)',
                'danger-bg': 'var(--danger-bg)',
                // REBRANDING OVERRIDE: Map 'teal' classes to Brand Burgundy
                teal: {
                    50: '#FDF2F4',  // Lightest pink/burgundy wash
                    100: '#FBE6E9',
                    200: '#F5C2C9',
                    300: '#E68A94',
                    400: '#D15C6B',
                    500: '#B84A56', // Medium Burgundy
                    600: '#8E2F39', // BRAND PRIMARY (Was Teal-600)
                    700: '#72222B', // Hover
                    800: '#5C1C23',
                    900: '#421419',
                    950: '#2A0C10',
                },
            },
            fontFamily: {
                sans: ['var(--font-dm-sans)', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
