import PrintButton from "./PrintButton";

// Dark, branded header shown above every report (manager preview + the
// public client-facing page) — matches the design handoff exactly.
export default function ReportBrandedHeader({ orgName }: { orgName: string }) {
  return (
    <div
      className="flex items-center justify-between bg-primary px-9 py-7"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}
    >
      <div>
        <p className="mb-0.5 text-lg font-extrabold text-white">{orgName}</p>
        <p className="text-[13px] text-[#B7C9D2]">Service Report · No login required</p>
      </div>
      <PrintButton variant="onDark" />
    </div>
  );
}
