import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#556B5D] text-white hover:bg-[#44574A] border border-[#556B5D] hover:border-[#44574A]",
  secondary:
    "bg-[#8FA393] text-white hover:bg-[#7D9183] border border-[#8FA393] hover:border-[#7D9183]",
  outline:
    "bg-transparent text-[#556B5D] border border-[#556B5D] hover:bg-[#EBF0EC]",
  ghost:
    "bg-transparent text-[#6B7A71] border border-transparent hover:bg-[#E7E3DA] hover:text-[#26302B]",
  danger:
    "bg-[#B85450] text-white hover:bg-[#A04846] border border-[#B85450] hover:border-[#A04846]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-2.5 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center font-medium rounded-lg",
          "transition-all duration-150 cursor-pointer select-none",
          "focus-visible:outline-2 focus-visible:outline-[#556B5D] focus-visible:outline-offset-2",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {loading && (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);
