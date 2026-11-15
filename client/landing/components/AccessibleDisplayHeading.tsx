import type { CSSProperties, ReactNode } from "react";

export function AccessibleDisplayHeading({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      data-accessible-display-heading="true"
      className={`block tracking-[0.035em] ${className}`}
      style={{ letterSpacing: "0.035em", ...style }}
    >
      {children}
    </span>
  );
}
