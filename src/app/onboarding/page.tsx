'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import styles from './page.module.css';

export default function OnboardingPage() {
    const [showModal, setShowModal] = useState(true);
    const router = useRouter();

    const handleCloseModal = () => {
        setShowModal(false);
        // Redirect to dashboard after closing modal
        router.push('/');
    };

    return (
        <div className={styles.container}>
            {showModal && <WelcomeModal onClose={handleCloseModal} />}

            <div className={styles.content}>
                <h1>Welcome to Your Workspace</h1>
                <p>Your account has been created successfully. You can now start managing your legal practice.</p>
            </div>
        </div>
    );
}
