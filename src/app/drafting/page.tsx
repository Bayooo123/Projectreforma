import DraftingStudio from '@/components/drafting/DraftingStudio';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Drafting Studio | Reforma',
    description: 'Intelligent legal drafting and review',
};

export default function DraftingPage() {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DraftingStudio />
        </div>
    );
}
