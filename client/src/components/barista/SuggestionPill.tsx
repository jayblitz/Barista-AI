import { motion } from "framer-motion";

interface SuggestionPillProps {
  text: string;
  emoji?: string;
  onClick: () => void;
  disabled?: boolean;
}

export function SuggestionPill({ text, emoji, onClick, disabled = false }: SuggestionPillProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-primary/30 bg-background/50 text-xs font-medium text-foreground whitespace-nowrap transition-colors hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid={`suggestion-${text.toLowerCase().replace(/\s+/g, '-').replace(/[?]/g, '')}`}
    >
      {emoji && <span className="text-sm">{emoji}</span>}
      <span>{text}</span>
    </motion.button>
  );
}

interface SuggestionPillsProps {
  suggestions: Array<{ text: string; emoji?: string }>;
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function SuggestionPills({ suggestions, onSelect, disabled = false }: SuggestionPillsProps) {
  return (
    <div 
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      data-testid="suggestion-pills-container"
    >
      {suggestions.map((suggestion) => (
        <SuggestionPill
          key={suggestion.text}
          text={suggestion.text}
          emoji={suggestion.emoji}
          onClick={() => onSelect(suggestion.text)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
