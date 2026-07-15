import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer transition-[transform,background-color,border-color,box-shadow,color,filter] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/65 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/35 bg-[linear-gradient(135deg,var(--nx-cyan-3),var(--nx-cyan),var(--nx-exec))] text-primary-foreground shadow-[0_12px_30px_-16px_rgba(0,212,255,.8),inset_0_1px_0_rgba(255,255,255,.28)] hover:brightness-110 hover:shadow-[0_16px_36px_-16px_rgba(0,212,255,.95)]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-primary/20 bg-background/45 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-md hover:border-primary/45 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_0_24px_-14px_rgba(0,212,255,.75)]",
        secondary:
          "border border-white/6 bg-secondary/80 text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.06)] hover:bg-secondary",
        ghost: "hover:bg-primary/10 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
