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
                'teal-bg': 'var(--teal-bg)',
                'teal-text': 'var(--teal-text)',
                'hover-bg': 'var(--hover-bg)',
            },
            fontFamily: {
                sans: ['var(--font-dm-sans)', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
