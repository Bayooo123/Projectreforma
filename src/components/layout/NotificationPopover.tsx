"use client";

import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import styles from './NotificationPopover.module.css';

const NOTIFICATIONS = [
    { id: 1, type: 'alert', message: 'Overdue payment from Dangote Group', time: '10 mins ago' },
    { id: 2, type: 'info', message: 'New brief uploaded by Tariq Audu', time: '1 hour ago' },
    { id: 3, type: 'success', message: 'Court date confirmed for State v. Johnson', time: '2 hours ago' },
    { id: 4, type: 'info', message: 'Staff meeting at 2:00 PM', time: '4 hours ago' },
];

const NotificationPopover = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Notifications</h3>
                <button className={styles.markRead}>Mark all as read</button>
            </div>

            <div className={styles.list}>
                {NOTIFICATIONS.map((notif) => (
                    <div key={notif.id} className={styles.item}>
                        <div className={`${styles.iconWrapper} ${styles[notif.type]}`}>
                            {notif.type === 'alert' && <AlertTriangle size={16} />}
                            {notif.type === 'success' && <CheckCircle size={16} />}
                            {notif.type === 'info' && <Info size={16} />}
                        </div>
                        <div className={styles.content}>
                            <p className={styles.message}>{notif.message}</p>
                            <span className={styles.time}>{notif.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotificationPopover;
