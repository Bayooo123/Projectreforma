import { Send, User } from 'lucide-react';
import styles from './CommentSection.module.css';

const CommentSection = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Comments (3)</h3>
            </div>

            <div className={styles.list}>
                <div className={styles.comment}>
                    <div className={styles.avatar}>
                        <User size={16} />
                    </div>
                    <div className={styles.content}>
                        <div className={styles.meta}>
                            <span className={styles.author}>Chioma Okoro</span>
                            <span className={styles.time}>2 hours ago</span>
                        </div>
                        <p className={styles.text}>
                            Please review paragraph 4. I think we need to cite the recent Supreme Court ruling on this matter.
                        </p>
                    </div>
                </div>

                <div className={styles.comment}>
                    <div className={styles.avatar} style={{ backgroundColor: '#E9D8FD', color: '#805AD5' }}>
                        <span className={styles.initial}>BA</span>
                    </div>
                    <div className={styles.content}>
                        <div className={styles.meta}>
                            <span className={styles.author}>Barr. Adebayo</span>
                            <span className={styles.time}>1 hour ago</span>
                        </div>
                        <p className={styles.text}>
                            Good catch, Chioma. I've added the citation. Let me know if it looks good.
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.inputArea}>
                <textarea
                    className={styles.textarea}
                    placeholder="Add a comment..."
                    rows={3}
                />
                <div className={styles.inputFooter}>
                    <button className={styles.sendBtn}>
                        <Send size={16} />
                        <span>Post</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentSection;
