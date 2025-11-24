import { FileText, Download, Share2, Printer, Maximize2, ZoomIn, ZoomOut, Image as ImageIcon, FileSpreadsheet, File as FileIcon } from 'lucide-react';
import styles from './DocumentViewer.module.css';

interface Document {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'image' | 'scan';
    size: number;
    uploadedAt: Date;
    ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    ocrText?: string;
}

interface DocumentViewerProps {
    document: Document;
}

const DocumentViewer = ({ document }: DocumentViewerProps) => {
    const renderContent = () => {
        switch (document.type) {
            case 'pdf':
            case 'scan':
                return (
                    <div className={styles.placeholder}>
                        <div className={styles.previewPage}>
                            <div className={styles.previewHeader}>
                                <h3>PREVIEW: {document.name}</h3>
                                <p>PDF / Scanned Document Viewer</p>
                            </div>
                            <div className={styles.previewContent}>
                                <p>This is a placeholder for the PDF viewer integration (e.g., react-pdf).</p>
                                <br />
                                <p><strong>Document ID:</strong> {document.id}</p>
                                <p><strong>Uploaded:</strong> {document.uploadedAt.toLocaleDateString()}</p>
                                <br />
                                {document.ocrText && (
                                    <div className={styles.ocrSection}>
                                        <h4>OCR Extracted Text:</h4>
                                        <p>{document.ocrText.substring(0, 500)}...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'image':
                return (
                    <div className={styles.imageContainer}>
                        <div className={styles.imagePlaceholder}>
                            <ImageIcon size={64} className={styles.placeholderIcon} />
                            <p>Image Preview: {document.name}</p>
                        </div>
                    </div>
                );
            case 'docx':
                return (
                    <div className={styles.placeholder}>
                        <div className={styles.previewPage}>
                            <div className={styles.previewHeader}>
                                <FileText size={48} />
                                <h3>Word Document</h3>
                            </div>
                            <div className={styles.previewContent}>
                                <p>Preview not available for DOCX files yet.</p>
                                <button className={styles.downloadBtn}>
                                    <Download size={16} /> Download to View
                                </button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className={styles.placeholder}>
                        <div className={styles.previewPage}>
                            <div className={styles.previewHeader}>
                                <FileIcon size={48} />
                                <h3>Unsupported File Type</h3>
                            </div>
                            <div className={styles.previewContent}>
                                <p>This file type cannot be previewed directly.</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.docInfo}>
                    <FileText size={20} className={styles.docIcon} />
                    <span className={styles.docName}>{document.name}</span>
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
                {renderContent()}
            </div>
        </div>
    );
};

export default DocumentViewer;
