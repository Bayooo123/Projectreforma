import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import styles from './FinancialOverview.module.css';

const FinancialOverview = () => {
    const metrics = [
        { label: 'Net Profit (YTD)', value: '₦45,250,000', change: '+12.5%', trend: 'up', icon: TrendingUp },
        { label: 'Operating Expenses', value: '₦12,800,000', change: '-2.4%', trend: 'down', icon: TrendingDown },
        { label: 'Partner Drawdowns', value: '₦28,000,000', change: 'On Track', trend: 'neutral', icon: PieChart },
        { label: 'Cash Reserve', value: '₦15,500,000', change: '+5.0%', trend: 'up', icon: DollarSign },
    ];

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Financial Performance</h3>
            <div className={styles.grid}>
                {metrics.map((metric, index) => (
                    <div key={index} className={styles.card}>
                        <div className={styles.header}>
                            <span className={styles.label}>{metric.label}</span>
                            <metric.icon size={18} className={styles.icon} />
                        </div>
                        <div className={styles.value}>{metric.value}</div>
                        <div className={`${styles.change} ${styles[metric.trend]}`}>
                            {metric.change}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FinancialOverview;
