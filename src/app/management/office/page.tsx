import { redirect } from 'next/navigation';

// Office Manager's expense log moved into Finance — same FinancialLog
// component, same PIN gate, now reached via /finance?tab=expenses instead
// of its own nav destination. This redirect keeps old links/bookmarks alive.
export default function OfficeManagementPage() {
    redirect('/finance?tab=expenses');
}
