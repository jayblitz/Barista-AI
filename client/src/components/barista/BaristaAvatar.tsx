import { motion } from "framer-motion";

interface BaristaAvatarProps {
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export function BaristaAvatar({ size = "md", animate = true }: BaristaAvatarProps) {
  const dimensions = {
    sm: 32,
    md: 48,
    lg: 56,
  };
  
  const dim = dimensions[size];

  return (
    <motion.div
      className="relative flex-shrink-0"
      style={{ width: dim, height: dim }}
      initial={animate ? { scale: 0.9 } : false}
      animate={animate ? { scale: 1 } : false}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <svg
        viewBox="0 0 48 48"
        width={dim}
        height={dim}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Barista Avatar"
      >
        <defs>
          <linearGradient id="coffeeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9945FF" />
            <stop offset="100%" stopColor="#7B2FE0" />
          </linearGradient>
          <linearGradient id="cupGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F5F5F5" />
          </linearGradient>
        </defs>
        
        {animate && (
          <>
            <ellipse
              cx="16"
              cy="8"
              rx="2"
              ry="4"
              fill="rgba(153, 69, 255, 0.4)"
              className="animate-steam"
            />
            <ellipse
              cx="24"
              cy="6"
              rx="2.5"
              ry="5"
              fill="rgba(153, 69, 255, 0.5)"
              className="animate-steam-delay-1"
            />
            <ellipse
              cx="32"
              cy="8"
              rx="2"
              ry="4"
              fill="rgba(153, 69, 255, 0.4)"
              className="animate-steam-delay-2"
            />
          </>
        )}
        
        <path
          d="M8 16 C8 14, 10 12, 14 12 L34 12 C38 12, 40 14, 40 16 L40 36 C40 42, 36 46, 28 46 L20 46 C12 46, 8 42, 8 36 Z"
          fill="url(#cupGradient)"
          stroke="#E5E5E5"
          strokeWidth="1"
        />
        
        <path
          d="M40 20 L44 20 C46 20, 48 22, 48 26 C48 30, 46 32, 44 32 L40 32"
          fill="none"
          stroke="url(#cupGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        <path
          d="M12 20 L36 20 L36 36 C36 40, 32 42, 24 42 C16 42, 12 40, 12 36 Z"
          fill="url(#coffeeGradient)"
        />
        
        <circle cx="18" cy="26" r="2.5" fill="#1A1A2E" />
        <circle cx="30" cy="26" r="2.5" fill="#1A1A2E" />
        
        <circle cx="19" cy="25" r="0.8" fill="white" />
        <circle cx="31" cy="25" r="0.8" fill="white" />
        
        <path
          d="M20 32 Q24 36, 28 32"
          fill="none"
          stroke="#1A1A2E"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}
