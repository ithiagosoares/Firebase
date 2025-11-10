"use client"

import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
}

export function PageHeader({ title, children, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6",
        className
      )}
      {...props}
    >
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
