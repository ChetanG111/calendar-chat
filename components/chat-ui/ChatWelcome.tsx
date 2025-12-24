import React from 'react';
import { motion } from 'framer-motion';

interface ChatWelcomeProps {
  onSuggestionClick: (suggestion: string) => void;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({ onSuggestionClick }) => {
  const suggestions = [
    "Schedule a meeting tomorrow at 2pm",
    "What's on my calendar this week?",
    "Create a daily standup at 9am",
  ];

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-[50vh] text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 15,
          delay: 0.1,
        }}
      >
        <span className="material-symbols-outlined text-muted-foreground text-3xl">calendar_month</span>
      </motion.div>
      <motion.h2
        className="text-xl font-semibold text-foreground mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
          delay: 0.2,
        }}
      >
        Calendar Assistant
      </motion.h2>
      <motion.p
        className="text-muted-foreground max-w-md"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
          delay: 0.25,
        }}
      >
        Ask me to create events, find meetings, or manage your schedule.
      </motion.p>
      <div className="flex flex-wrap gap-2 mt-6 justify-center">
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 20,
                delay: 0.3 + index * 0.08,
              }
            }}
          >
            <motion.button
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3 py-1.5 text-sm text-muted-foreground bg-card border border-border rounded-full hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{
                scale: 0.95,
                transition: { duration: 0.1 }
              }}
            >
              {suggestion}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
