"use client";

import LitigationForm from './LitigationForm';

interface RecordProceedingModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
}

const RecordProceedingModal = (props: RecordProceedingModalProps) => {
    return <LitigationForm {...props} mode="update" />;
};

export default RecordProceedingModal;
