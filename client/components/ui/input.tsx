import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
  /** Lowercase HTML spelling of `readOnly`, accepted and normalised. */
  readonly?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, error, helperText, readonly, ...props }, ref) => {
    // `<input readonly>` is valid HTML, but React only honours the camelCase
    // `readOnly` prop and drops the lowercase attribute. Normalise it so either
    // spelling actually locks the field.
    const readOnly = props.readOnly ?? readonly;
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center justify-center text-muted-foreground">
              <span role="img" aria-label={React.isValidElement(leftIcon) ? String((leftIcon.props as Record<string, unknown>)['aria-label'] ?? '') : ''}>{leftIcon}</span>
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-red-500 focus-visible:ring-red-500",
              className,
            )}
            ref={ref}
            {...props}
            readOnly={readOnly}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center justify-center text-muted-foreground">
              <span role="img" aria-label={React.isValidElement(rightIcon) ? String((rightIcon.props as Record<string, unknown>)['aria-label'] ?? '') : ''}>{rightIcon}</span>
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
