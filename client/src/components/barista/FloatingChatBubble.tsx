import { motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

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
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl flex items-center justify-center z-50 animate-pulse-glow"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isOpen ? "Close chat" : "Open chat"}
      data-testid="floating-chat-bubble"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {isOpen ? (
          <X className="w-7 h-7" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-7 h-7" />
            <span className="absolute -top-0.5 -right-0.5 text-lg">☕</span>
          </div>
        )}
      </motion.div>
      
      {hasUnread && !isOpen && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-chart-2 rounded-full flex items-center justify-center"
        >
          <span className="w-2 h-2 bg-white rounded-full" />
        </motion.span>
      )}
    </motion.button>
  );
}
