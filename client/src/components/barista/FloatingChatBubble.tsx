import { motion } from "framer-motion";
import { X, Coffee, Sparkles } from "lucide-react";

interface FloatingChatBubbleProps {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export function FloatingChatBubble({ isOpen, onClick, hasUnread = false }: FloatingChatBubbleProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center z-50 animate-pulse-glow animate-float"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      aria-label={isOpen ? "Close chat" : "Open chat"}
      data-testid="floating-chat-bubble"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <Coffee className="w-6 h-6" />
            <motion.span
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-primary-foreground" />
            </motion.span>
          </div>
        )}
      </motion.div>
      
      {hasUnread && !isOpen && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center"
          data-testid="unread-indicator"
        >
          <span className="w-2 h-2 bg-white rounded-full" data-testid="unread-indicator-dot" />
        </motion.span>
      )}
    </motion.button>
  );
}
