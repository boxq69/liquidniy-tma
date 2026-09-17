import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function ScrollRail({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("scroll-rail-x", className)} {...props}>
      {children}
    </div>
  );
}
