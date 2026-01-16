import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-primary to-blue-600 text-primary-foreground hover:shadow-lg hover:scale-105 shadow-md",
        destructive:
          "bg-gradient-to-br from-destructive to-rose-600 text-destructive-foreground hover:shadow-lg hover:scale-105 shadow-md",
        outline:
          "border border-input bg-background hover:bg-accent/10 hover:text-accent hover:border-accent transition-colors",
        secondary:
          "bg-gradient-to-br from-secondary to-cyan-600 text-secondary-foreground hover:shadow-lg hover:scale-105 shadow-md",
        success:
          "bg-gradient-to-br from-success to-emerald-600 text-success-foreground hover:shadow-lg hover:scale-105 shadow-md",
        warning:
          "bg-gradient-to-br from-warning to-amber-600 text-warning-foreground hover:shadow-lg hover:scale-105 shadow-md",
        ghost: "hover:bg-accent/10 hover:text-accent text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-lg",
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
