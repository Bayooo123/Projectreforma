'use client';

import { motion } from 'framer-motion';

export default function FluidLoader() {
    const dotTransition = {
        duration: 0.6,
        repeat: Infinity,
        repeatType: 'reverse' as const,
        ease: "easeInOut" as const
    };

    return (
        <div className="flex items-center justify-center gap-2 py-12">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-primary"
                    initial={{ y: 0, opacity: 0.5 }}
                    animate={{ y: -6, opacity: 1 }}
                    transition={{
                        ...dotTransition,
                        delay: i * 0.15 // Stagger the wave
                    }}
                />
            ))}
            <span className="sr-only">Loading...</span>
        </div>
    );
}
