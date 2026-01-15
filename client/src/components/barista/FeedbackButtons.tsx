import { ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface FeedbackButtonsProps {
  messageId: string;
  currentFeedback: "positive" | "negative" | null;
  onFeedback: (messageId: string, feedback: "positive" | "negative") => void;
}

function BurstParticles({ show }: { show: boolean }) {
  const particles = Array.from({ length: 8 }, (_, i) => i);
  
  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {particles.map((i) => {
            const angle = (i / 8) * 360;
            const distance = 20 + Math.random() * 15;
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance;
            
            return (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ 
                  x: x, 
                  y: y, 
                  scale: 0,
                  opacity: 0 
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.5, 
                  ease: "easeOut",
                  delay: i * 0.02 
                }}
              />
            );
          })}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function FeedbackButtons({ messageId, currentFeedback, onFeedback }: FeedbackButtonsProps) {
  const [showBurst, setShowBurst] = useState(false);
  const [prevFeedback, setPrevFeedback] = useState(currentFeedback);

  useEffect(() => {
    if (currentFeedback === "positive" && prevFeedback !== "positive") {
      setShowBurst(true);
      const timer = setTimeout(() => setShowBurst(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevFeedback(currentFeedback);
  }, [currentFeedback, prevFeedback]);

  const handlePositiveFeedback = () => {
    if (currentFeedback !== "positive") {
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 600);
    }
    onFeedback(messageId, "positive");
  };

  return (
    <div className="flex items-center gap-1 mt-2" data-testid={`feedback-buttons-${messageId}`}>
      <motion.button
        type="button"
        onClick={handlePositiveFeedback}
        className={`relative p-1 rounded-md transition-colors ${
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
        <BurstParticles show={showBurst} />
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
