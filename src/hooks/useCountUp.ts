import { useState, useEffect } from 'react';

export function useCountUp(end: number, duration: number = 1500) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrame: number;

        const easeOutExpo = (t: number) => {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        };

        const updateCount = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            
            if (progress < duration) {
                const easeProgress = easeOutExpo(progress / duration);
                const currentVal = Math.floor(easeProgress * end);
                setCount(Math.min(end, currentVal));
                animationFrame = requestAnimationFrame(updateCount);
            } else {
                setCount(end);
            }
        };

        if (end > 0) {
            animationFrame = requestAnimationFrame(updateCount);
        } else {
            setCount(0);
        }

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
}
