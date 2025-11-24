import { MapPin, User } from 'lucide-react';
import styles from './EventList.module.css';

const EventList = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Upcoming Events</h3>
            </div>

            <div className={styles.list}>
                <div className={styles.group}>
                    <h4 className={styles.groupTitle}>Tomorrow</h4>
                    <div className={styles.eventCard}>
                        <div className={styles.timeBadge}>09:00</div>
                        <div className={styles.eventContent}>
                            <h5 className={styles.eventTitle}>Simisola v. COP</h5>
                            <div className={styles.eventMeta}>
                                <MapPin size={14} />
                                <span>High Court 4</span>
                            </div>
                            <div className={styles.eventMeta}>
                                <User size={14} />
                                <span>Justice Adeyemi</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.group}>
                    <h4 className={styles.groupTitle}>Tuesday, Nov 26</h4>
                    <div className={styles.eventCard}>
                        <div className={styles.timeBadge}>10:30</div>
                        <div className={styles.eventContent}>
                            <h5 className={styles.eventTitle}>Estate of Daudu</h5>
                            <div className={styles.eventMeta}>
                                <MapPin size={14} />
                                <span>Probate Registry</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.group}>
                    <h4 className={styles.groupTitle}>Thursday, Nov 28</h4>
                    <div className={styles.eventCard}>
                        <div className={styles.timeBadge}>09:00</div>
                        <div className={styles.eventContent}>
                            <h5 className={styles.eventTitle}>TechCorp v. FirstBank</h5>
                            <div className={styles.eventMeta}>
                                <MapPin size={14} />
                                <span>Federal High Court</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.eventCard}>
                        <div className={styles.timeBadge}>14:00</div>
                        <div className={styles.eventContent}>
                            <h5 className={styles.eventTitle}>FGN v. Adewale</h5>
                            <div className={styles.eventMeta}>
                                <MapPin size={14} />
                                <span>Court of Appeal</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventList;
