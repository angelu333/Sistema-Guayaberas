import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, error, hint, leftIcon, rightIcon, id, className = "", ...rest },
    ref
  ) {
    const defaultId = useId();
    const inputId = id ?? `input-${defaultId}`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#26302B]"
          >
            {label}
            {rest.required && (
              <span className="ml-1 text-[#B85450]" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[#9DAAA2] pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              "w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#26302B]",
              "placeholder:text-[#9DAAA2]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30 focus:border-[#556B5D]",
              error
                ? "border-[#B85450] focus:ring-[#B85450]/30 focus:border-[#B85450]"
                : "border-[#DDD9D0] hover:border-[#8FA393]",
              leftIcon ? "pl-9" : "",
              rightIcon ? "pr-9" : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...rest}
          />

          {rightIcon && (
            <span className="absolute right-3 text-[#9DAAA2]">
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs text-[#B85450]" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-[#9DAAA2]">{hint}</p>
        )}
      </div>
    );
  }
);
