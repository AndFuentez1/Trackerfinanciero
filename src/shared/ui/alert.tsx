import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/core/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 flex items-start gap-3",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, children, ...props }, ref) => {
  const childrenArray = React.Children.toArray(children);

  // Treat the first child as an icon if it's not a known text component
  const firstChild = childrenArray[0];
  const hasIcon = React.isValidElement(firstChild) &&
    firstChild.type !== AlertTitle &&
    firstChild.type !== AlertDescription;

  const icon = hasIcon ? firstChild : null;
  const content = hasIcon ? childrenArray.slice(1) : childrenArray;

  return (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {icon}
      <div className="flex flex-col grow min-w-0">
        {content}
      </div>
    </div>
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
