"use client";

import React from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// Quiz Box Component
// ============================================================================

export interface QuizBoxProps {
    messageId: string;
    question: string;
    onAnswer: (answer: 'yes' | 'no' | 'custom') => void;
    onFocusInput: () => void;
}

export function QuizBox({
    messageId,
    question,
    onAnswer,
    onFocusInput,
}: QuizBoxProps) {

    const handleCustomClick = () => {
        onAnswer('custom');
        onFocusInput();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
            }}
            className="bg-card border border-border rounded-2xl p-4 shadow-lg max-w-md"
        >
            {/* Question display */}
            <div className="flex items-start gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">quiz</span>
                <div className="flex-1">
                    <p className="text-foreground font-medium">{question}</p>
                </div>
            </div>

            {/* Answer buttons */}
            <div className="flex gap-2">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onAnswer('yes')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-green-500/20 border border-green-500/50 text-green-400 font-medium hover:bg-green-500/30 transition-colors"
                >
                    Yes
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onAnswer('no')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
                >
                    No
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCustomClick}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-muted border border-border text-foreground font-medium hover:bg-accent transition-colors"
                >
                    Custom
                </motion.button>
            </div>
        </motion.div>
    );
}

export default QuizBox;
