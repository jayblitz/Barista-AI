import { ThumbsUp, ThumbsDown } from "lucide-react";
import { motion } from "framer-motion";

interface FeedbackButtonsProps {
  messageId: string;
  currentFeedback: "positive" | "negative" | null;
  onFeedback: (messageId: string, feedback: "positive" | "negative") => void;
}

export function FeedbackButtons({ messageId, currentFeedback, onFeedback }: FeedbackButtonsProps) {
  return (
    <div className="flex items-center gap-1 mt-2" data-testid={`feedback-buttons-${messageId}`}>
      <motion.button
        type="button"
        onClick={() => onFeedback(messageId, "positive")}
        className={`p-1 rounded-md transition-colors ${
          currentFeedback === "positive" 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Helpful response"
        data-testid={`button-feedback-positive-${messageId}`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </motion.button>
      <motion.button
        type="button"
        onClick={() => onFeedback(messageId, "negative")}
        className={`p-1 rounded-md transition-colors ${
          currentFeedback === "negative" 
            ? "bg-destructive text-destructive-foreground" 
            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Not helpful response"
        data-testid={`button-feedback-negative-${messageId}`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </motion.button>
    </div>
  );
}
