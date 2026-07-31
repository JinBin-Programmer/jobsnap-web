"use client";

import type { ButtonHTMLAttributes } from "react";

interface ConfirmSubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  confirmMessage: string;
}

// A type="submit" button that confirms before letting the enclosing form's
// action fire — for destructive actions (delete) that previously submitted
// on a single click with no "are you sure."
export default function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  children,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <button
      {...props}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
