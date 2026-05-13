import { getSiteVisits } from '@/app/actions/admin';
import VisitorsClient from './VisitorsClient';

export default async function VisitorsPage() {
    const visits = await getSiteVisits(500);
    return <VisitorsClient visits={visits} />;
}
