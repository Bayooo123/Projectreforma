import styles from './EquityTable.module.css';

const PARTNERS = [
    { name: 'Barr. Adebayo', share: '40%', ytd: '₦11,200,000', status: 'Senior Partner' },
    { name: 'Mrs. Johnson', share: '30%', ytd: '₦8,400,000', status: 'Partner' },
    { name: 'Mr. Okonkwo', share: '20%', ytd: '₦5,600,000', status: 'Partner' },
    { name: 'Firm Reserve', share: '10%', ytd: '₦2,800,000', status: 'Entity' },
];

const EquityTable = () => {
    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Equity Distribution</h3>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Partner Name</th>
                            <th>Equity Share</th>
                            <th>YTD Distribution</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PARTNERS.map((partner, index) => (
                            <tr key={index}>
                                <td className={styles.nameCell}>
                                    <div className={styles.avatar}>{partner.name.charAt(0)}</div>
                                    <span className={styles.name}>{partner.name}</span>
                                </td>
                                <td className={styles.share}>{partner.share}</td>
                                <td className={styles.ytd}>{partner.ytd}</td>
                                <td>
                                    <span className={styles.status}>{partner.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EquityTable;
