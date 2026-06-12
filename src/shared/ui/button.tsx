import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/core/utils";

const buttonVariants = cva(
  "btn-base inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border border-transparent shadow-sm hover:bg-background hover:text-foreground hover:border-primary transition-all duration-300",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all",
        outline: "border border-primary/80 bg-background text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300",
        secondary: "bg-background border border-primary text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground transition-all duration-300",
        ghost: "bg-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all",
        link: "text-primary underline-offset-4 hover:underline transition-all",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-11 rounded-xl px-8",
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
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const wrappedChildren = React.Children.map(children, (child) => {
      if (typeof child === "string" || typeof child === "number") {
        return <span className="button-text">{child}</span>;
      }
      return child;
    });

    // Detect pattern where a child contains mobile-hidden text (e.g. "hidden sm:inline")
    // and automatically apply an icon-style compact layout on small screens so header buttons
    // stay square and consistent on mobile without requiring changes at every call site.
    const hasHiddenMobileText = React.Children.toArray(children).some((child) => {
      if (!React.isValidElement(child)) return false;
      const cnProp = (child.props && child.props.className) || '';
      return typeof cnProp === 'string' && cnProp.includes('hidden') && cnProp.includes('sm:inline');
    });

    const responsiveClass = hasHiddenMobileText ? 'sm:h-9 sm:px-3 h-10 w-10 px-0 rounded-full' : '';

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }), responsiveClass)} ref={ref} {...props}>
        {wrappedChildren}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
