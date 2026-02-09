import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-2xl border px-6 py-5 text-sm backdrop-blur-sm transition-all duration-300 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-6 [&>svg]:top-5 [&>svg]:text-foreground [&>svg~*]:pl-10",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 text-blue-800 [&>svg]:text-blue-600",
        success: "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-800 [&>svg]:text-emerald-600",
        warning: "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-800 [&>svg]:text-amber-600",
        destructive: "bg-gradient-to-r from-rose-50 to-red-50 border-rose-200 text-rose-800 [&>svg]:text-rose-600",
        info: "bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 text-indigo-800 [&>svg]:text-indigo-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, children, ...props }, ref) => {
  const Icon = {
    default: Info,
    success: CheckCircle,
    warning: AlertCircle,
    destructive: XCircle,
    info: Info,
  }[variant || "default"]

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className, "group hover:shadow-md transition-shadow")}
      {...props}
    >
      <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
      {children}
    </div>
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-2 font-bold text-lg leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed opacity-90", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }