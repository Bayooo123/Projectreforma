"use client";

import LitigationForm from './LitigationForm';

interface AddMatterModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
}

const AddMatterModal = (props: AddMatterModalProps) => {
    return <LitigationForm {...props} mode="create" />;
};

export default AddMatterModal;
