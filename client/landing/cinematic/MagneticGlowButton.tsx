import React, { useRef, useState, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface MagneticGlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  to?: string;
  href?: string;
  children: React.ReactNode;
  magneticStrength?: number; // 0.1 to 0.5
  glowColor?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MagneticGlowButton({
  to,
  href,
  children,
  magneticStrength = 0.35,
  glowColor = "rgba(255, 255, 255, 0.2)",
  variant = "primary",
  size = "md",
  className,
  ...props
}: MagneticGlowButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * magneticStrength;
    const deltaY = (e.clientY - centerY) * magneticStrength;

    setPosition({ x: deltaX, y: deltaY });
    setGlowPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setPosition({ x: 0, y: 0 });
    setGlowPos({ x: -100, y: -100 });
  };

  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base font-semibold",
  };

  const variantClasses = {
    primary: "bg-white text-black font-bold hover:bg-gray-200 border border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.3)]",
    secondary: "bg-white/10 text-white hover:bg-white/15 border border-white/20",
    outline: "bg-transparent text-white border border-white/50 hover:bg-white/10",
    ghost: "bg-transparent text-gray-300 hover:text-white hover:bg-white/5 border border-transparent",
  };

  const content = (
    <>
      {/* Pointer-Following Radial Glow */}
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-full transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(120px circle at ${glowPos.x}px ${glowPos.y}px, ${glowColor}, transparent 70%)`,
        }}
      />
      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </>
  );

  const sharedClasses = cn(
    "relative inline-flex items-center justify-center rounded-full font-mono tracking-wide transition-transform duration-200 ease-out active:scale-95 overflow-hidden select-none",
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  const style = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
  };

  if (to) {
    return (
      <Link
        to={to}
        ref={buttonRef as any}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={sharedClasses}
        style={style}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        ref={buttonRef as any}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={sharedClasses}
        style={style}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={buttonRef as any}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={sharedClasses}
      style={style}
      {...props}
    >
      {content}
    </button>
  );
}

export default MagneticGlowButton;
