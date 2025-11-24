import { Lock, FileText, AlertTriangle } from 'lucide-react';
import styles from './StrategicBriefs.module.css';

const BRIEFS = [
    { title: 'Merger Acquisition: Dangote & Shell', status: 'Confidential', risk: 'High' },
    { title: 'Arbitration: FGN vs TechCorp', status: 'Restricted', risk: 'Medium' },
    { title: 'Internal Audit Report 2024', status: 'Private', risk: 'Internal' },
];

const StrategicBriefs = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Strategic Briefs</h3>
                <Lock size={16} className={styles.lockIcon} />
            </div>

            <div className={styles.list}>
                {BRIEFS.map((brief, index) => (
                    <div key={index} className={styles.item}>
                        <div className={styles.iconWrapper}>
                            <FileText size={18} />
                        </div>
                        <div className={styles.info}>
                            <p className={styles.briefTitle}>{brief.title}</p>
                            <div className={styles.meta}>
                                <span className={styles.status}>{brief.status}</span>
                                {brief.risk === 'High' && (
                                    <span className={styles.risk}>
                                        <AlertTriangle size={12} /> High Risk
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StrategicBriefs;
