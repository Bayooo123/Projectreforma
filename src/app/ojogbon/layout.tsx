import type { Metadata } from 'next';
import { Bricolage_Grotesque, Atkinson_Hyperlegible } from 'next/font/google';

const display = Bricolage_Grotesque({
    subsets: ['latin'],
    weight: ['600', '700', '800'],
    variable: '--font-oj-display',
    display: 'swap',
});

const body = Atkinson_Hyperlegible({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-oj-body',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Ojogbon | The writing supervisor every student deserves',
    description:
        'Ojogbon breaks your paper into phases, tells you what to write and read in each, and checks your work as you go. It never writes it for you.',
    openGraph: {
        title: 'Ojogbon | The writing supervisor every student deserves',
        description:
            'An AI writing supervisor for students and scholars. It coaches you through the paper and never writes it for you.',
        type: 'website',
    },
};

export default function OjogbonLayout({ children }: { children: React.ReactNode }) {
    return <div className={`${display.variable} ${body.variable}`}>{children}</div>;
}
