import PasswordProtected from '@/components/auth/PasswordProtected';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import OfficeView from './OfficeView';

export const dynamic = 'force-dynamic';

export default async function OfficePage() {
    const { workspace } = (await getCurrentUserWithWorkspace()) || {};

    return (
        <PasswordProtected password="12345678">
            <OfficeView workspace={workspace} />
        </PasswordProtected>
    );
}

