import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 backdrop-blur-xl border overflow-hidden relative group before:absolute before:inset-0 before:-z-10 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-1000 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
  {
    variants: {
      variant: {
        default: 
          "bg-white/20 text-white border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:bg-white/30 hover:border-white/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-0.5",
        destructive:
          "bg-red-500/30 text-white border-red-500/50 hover:bg-red-500/50 hover:border-red-400/80 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] hover:-translate-y-0.5",
        outline:
          "border-white/40 bg-white/5 text-white hover:bg-white/20 hover:border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:-translate-y-0.5",
        secondary:
          "bg-indigo-500/20 text-indigo-100 border-indigo-400/40 hover:bg-indigo-500/40 hover:border-indigo-400/70 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:-translate-y-0.5",
        ghost: "border-transparent bg-transparent text-white/90 hover:bg-white/20 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]",
        link: "border-transparent bg-transparent text-white underline-offset-4 hover:underline shadow-none hover:text-blue-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
