"use client";

export default function PrintButton({ variant = "default" }: { variant?: "default" | "onDark" }) {
  const className =
    variant === "onDark"
      ? "inline-flex items-center gap-2 rounded-lg border border-steel bg-[#2C3E44] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#33474f] print:hidden"
      : "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted print:hidden";

  return (
    <button onClick={() => window.print()} className={className}>
      Download PDF
    </button>
  );
}
