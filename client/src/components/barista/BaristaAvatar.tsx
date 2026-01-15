import { motion } from "framer-motion";
import baristaLogo from "@assets/2026-01-15_07.08.55_1768460960171.jpg";

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
      <img
        src={baristaLogo}
        alt="Barista Avatar"
        width={dim}
        height={dim}
        className="rounded-full object-cover"
        style={{ width: dim, height: dim }}
      />
    </motion.div>
  );
}
