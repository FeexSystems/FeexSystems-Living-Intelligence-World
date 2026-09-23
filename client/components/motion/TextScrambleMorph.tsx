import React, { useEffect, useState, useRef } from "react";
import { usePrefersReducedMotion } from "../sovereign/useA11yCompliance";

interface TextScrambleMorphProps {
  text: string;
  className?: string;
  characters?: string;
  speed?: number;
  triggerOnHover?: boolean;
}

const DEFAULT_CHARS = "0101_#@!$%^&*<>[]{}~";

export function TextScrambleMorph({
  text,
  className = "",
  characters = DEFAULT_CHARS,
  speed = 30,
  triggerOnHover = true,
}: TextScrambleMorphProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  // Reduced motion: render the final copy statically — no scrambling, no hover replay.
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const frameRef = useRef<number | null>(null);

  const scramble = () => {
    if (isScrambling || prefersReducedMotion) return;
    setIsScrambling(true);

    let iteration = 0;
    const target = text;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const interval = setInterval(() => {
      setDisplayText(
        target
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) {
              return target[index];
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join("")
      );

      if (iteration >= target.length) {
        clearInterval(interval);
        setIsScrambling(false);
      }

      iteration += 1 / 2;
    }, speed);
  };

  useEffect(() => {
    if (prefersReducedMotion) {
      // Keep the legible copy in sync without animation when motion is reduced.
      setDisplayText(text);
      setIsScrambling(false);
      return;
    }
    scramble();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, prefersReducedMotion]);

  return (
    <span
      onMouseEnter={triggerOnHover && !prefersReducedMotion ? scramble : undefined}
      className={`font-mono transition-colors cursor-default ${className}`}
    >
      {displayText}
    </span>
  );
}

export default TextScrambleMorph;
