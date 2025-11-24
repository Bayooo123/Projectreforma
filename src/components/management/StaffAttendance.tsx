import { Clock } from 'lucide-react';
import styles from './StaffAttendance.module.css';

const STAFF = [
    { id: 1, name: 'Chioma Okoro', role: 'Associate', status: 'Present', time: '08:15 AM' },
    { id: 2, name: 'Barr. Adebayo', role: 'Partner', status: 'Present', time: '09:00 AM' },
    { id: 3, name: 'Emeka Nnadi', role: 'Paralegal', status: 'Late', time: '09:45 AM' },
    { id: 4, name: 'Sarah Johnson', role: 'Secretary', status: 'Absent', time: '-' },
];

const StaffAttendance = () => {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.title}>Staff Attendance</h3>
                <span className={styles.date}>Today, Nov 25</span>
            </div>

            <div className={styles.list}>
                {STAFF.map((staff) => (
                    <div key={staff.id} className={styles.item}>
                        <div className={styles.info}>
                            <p className={styles.name}>{staff.name}</p>
                            <p className={styles.role}>{staff.role}</p>
                        </div>
                        <div className={styles.statusWrapper}>
                            {staff.status === 'Present' && <span className={`${styles.badge} ${styles.present}`}>Present</span>}
                            {staff.status === 'Late' && <span className={`${styles.badge} ${styles.late}`}>Late</span>}
                            {staff.status === 'Absent' && <span className={`${styles.badge} ${styles.absent}`}>Absent</span>}
                            <div className={styles.time}>
                                <Clock size={14} />
                                <span>{staff.time}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StaffAttendance;
