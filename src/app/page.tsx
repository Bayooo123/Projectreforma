import Card from '@/components/ui/Card';
import TaskAssignmentWidget from '@/components/dashboard/TaskAssignmentWidget';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.subtitle}>Welcome back, Barrister. Here is your daily summary.</p>
      </div>

      <TaskAssignmentWidget />

      <div className={styles.grid}>
        <Card title="Recent Briefs">
          <div className={styles.placeholderContent}>
            <p>No recent briefs accessed.</p>
          </div>
        </Card>
        <Card title="Upcoming Court Dates">
          <div className={styles.placeholderContent}>
            <p>No upcoming court dates for today.</p>
          </div>
        </Card>
        <Card title="Pending Tasks">
          <div className={styles.placeholderContent}>
            <p>You have no pending tasks.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
