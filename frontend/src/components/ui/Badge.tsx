type BadgeVariant = "success" | "warning" | "error" | "primary" | "secondary" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success:   "bg-[#EBF5F0] text-[#3F7D58]",
  warning:   "bg-[#FDF5E4] text-[#D89B2B]",
  error:     "bg-[#FAEAEA] text-[#B85450]",
  primary:   "bg-[#EBF0EC] text-[#556B5D]",
  secondary: "bg-[#F0F4F1] text-[#8FA393]",
  neutral:   "bg-[#E7E3DA] text-[#6B7A71]",
};

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full",
        "text-xs font-medium leading-relaxed",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
