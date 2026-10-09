import { useEffect, useState, useRef } from "react";

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
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const frameRef = useRef<number | null>(null);

  const scramble = () => {
    if (isScrambling) return;
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
    scramble();
  }, [text]);

  return (
    <span
      onMouseEnter={triggerOnHover ? scramble : undefined}
      className={`font-mono transition-colors cursor-default ${className}`}
    >
      {displayText}
    </span>
  );
}

export default TextScrambleMorph;
