"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import TaskAssignmentWidget from '@/components/dashboard/TaskAssignmentWidget';
import styles from './page.module.css';

export default function Home() {
  const [stats, setStats] = useState<any>({
    recentBriefs: [],
    upcomingCourtDates: [],
    pendingTasks: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.subtitle}>Welcome back, Barrister. Here is your daily summary.</p>
      </div>

      <TaskAssignmentWidget />

      <div className={styles.grid}>
        <Card title="Recent Briefs">
          {isLoading ? (
            <div className={styles.placeholderContent}><p>Loading...</p></div>
          ) : stats.recentBriefs.length === 0 ? (
            <div className={styles.placeholderContent}>
              <p>No recent briefs accessed.</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {stats.recentBriefs.map((brief: any) => (
                <li key={brief.id} className={styles.listItem}>
                  <Link href={`/briefs/${brief.id}`} className={styles.link}>
                    <span className={styles.itemName}>{brief.name}</span>
                    <span className={styles.itemDate}>{new Date(brief.updatedAt).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Upcoming Court Dates">
          {isLoading ? (
            <div className={styles.placeholderContent}><p>Loading...</p></div>
          ) : stats.upcomingCourtDates.length === 0 ? (
            <div className={styles.placeholderContent}>
              <p>No upcoming court dates for today.</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {stats.upcomingCourtDates.map((matter: any) => (
                <li key={matter.id} className={styles.listItem}>
                  <div className={styles.itemContent}>
                    <span className={styles.itemName}>{matter.name}</span>
                    <span className={styles.itemSub}>{matter.court}</span>
                  </div>
                  <span className={styles.itemDate}>{new Date(matter.nextCourtDate).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Pending Tasks">
          {isLoading ? (
            <div className={styles.placeholderContent}><p>Loading...</p></div>
          ) : stats.pendingTasks.length === 0 ? (
            <div className={styles.placeholderContent}>
              <p>You have no pending tasks.</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {stats.pendingTasks.map((task: any) => (
                <li key={task.id} className={styles.listItem}>
                  <div className={styles.itemContent}>
                    <span className={styles.itemName}>{task.name}</span>
                    <span className={styles.itemSub}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                  <span className={styles.statusBadge}>Active</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
