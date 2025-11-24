import { FileText, Download, Share2, Printer, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import styles from './DocumentViewer.module.css';

const DocumentViewer = () => {
    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.docInfo}>
                    <FileText size={20} className={styles.docIcon} />
                    <span className={styles.docName}>Final_Written_Address_v2.pdf</span>
                </div>
                <div className={styles.actions}>
                    <button className={styles.actionBtn} title="Zoom Out">
                        <ZoomOut size={18} />
                    </button>
                    <button className={styles.actionBtn} title="Zoom In">
                        <ZoomIn size={18} />
                    </button>
                    <div className={styles.divider} />
                    <button className={styles.actionBtn} title="Print">
                        <Printer size={18} />
                    </button>
                    <button className={styles.actionBtn} title="Download">
                        <Download size={18} />
                    </button>
                    <button className={styles.actionBtn} title="Share">
                        <Share2 size={18} />
                    </button>
                    <div className={styles.divider} />
                    <button className={styles.actionBtn} title="Fullscreen">
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>

            <div className={styles.viewer}>
                {/* Placeholder for PDF Viewer */}
                <div className={styles.placeholder}>
                    <div className={styles.previewPage}>
                        <div className={styles.previewHeader}>
                            <h3>IN THE HIGH COURT OF LAGOS STATE</h3>
                            <p>IN THE IKEJA JUDICIAL DIVISION</p>
                            <p>HOLDEN AT IKEJA</p>
                        </div>
                        <div className={styles.previewContent}>
                            <p><strong>SUIT NO: ID/1234/2025</strong></p>
                            <br />
                            <p><strong>BETWEEN:</strong></p>
                            <p>SIMISOLA ADELEKE ................................. CLAIMANT</p>
                            <p><strong>AND</strong></p>
                            <p>COMMISSIONER OF POLICE ........................... DEFENDANT</p>
                            <br />
                            <h4 style={{ textAlign: 'center', textDecoration: 'underline' }}>DEFENDANT'S FINAL WRITTEN ADDRESS</h4>
                            <br />
                            <p><strong>1.0 INTRODUCTION</strong></p>
                            <p>1.1 This is the final written address of the Defendant in respect of the trial concluded on the 15th of October, 2025.</p>
                            <p>1.2 The Claimant via a Writ of Summons dated...</p>
                            {/* Mock text lines to simulate document content */}
                            <div className={styles.mockLine} style={{ width: '90%' }}></div>
                            <div className={styles.mockLine} style={{ width: '95%' }}></div>
                            <div className={styles.mockLine} style={{ width: '85%' }}></div>
                            <div className={styles.mockLine} style={{ width: '92%' }}></div>
                            <div className={styles.mockLine} style={{ width: '88%' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentViewer;
