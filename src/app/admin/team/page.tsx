import { getPlatformTeam } from '@/app/actions/admin-team';
import TeamClient from './TeamClient';

export default async function TeamPage() {
    const { admins, pendingInvites } = await getPlatformTeam();
    return <TeamClient admins={admins} pendingInvites={pendingInvites} />;
}
