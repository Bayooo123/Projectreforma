"use client";

import { useState } from 'react';
import { Send, Paperclip, User, Calendar } from 'lucide-react';
import styles from './TaskAssignmentWidget.module.css';

const STAFF = ['Kemi Adeniran', 'Adebayo Ogundimu', 'Bola Okafor', 'Chinedu Okeke'];

const TaskAssignmentWidget = () => {
    const [task, setTask] = useState('');
    const [assignee, setAssignee] = useState('');
    const [dueDate, setDueDate] = useState('');

    const handleAssign = () => {
        if (!task || !assignee) return;
        alert(`Task assigned to ${assignee}: "${task}"`);
        setTask('');
        setAssignee('');
        setDueDate('');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Quick Task Assignment</h3>
                <span className={styles.badge}>New Task</span>
            </div>

            <div className={styles.form}>
                <textarea
                    className={styles.textarea}
                    placeholder="Describe the task (e.g., 'Handle the statement of defence in the MTN matter')..."
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    rows={3}
                />

                <div className={styles.controls}>
                    <div className={styles.inputs}>
                        <div className={styles.inputGroup}>
                            <User size={16} className={styles.icon} />
                            <select
                                className={styles.select}
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                            >
                                <option value="">Assign to...</option>
                                {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className={styles.inputGroup}>
                            <Calendar size={16} className={styles.icon} />
                            <input
                                type="date"
                                className={styles.dateInput}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        <button className={styles.attachBtn}>
                            <Paperclip size={16} />
                            <span>Attach</span>
                        </button>
                    </div>

                    <button className={styles.submitBtn} onClick={handleAssign}>
                        <span>Assign Task</span>
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskAssignmentWidget;
