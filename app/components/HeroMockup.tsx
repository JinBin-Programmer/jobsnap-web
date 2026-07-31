// The hero's real-product-UI mockup — a static preview of an actual task's
// site visit timeline, matching the live dashboard's own styling. No stock
// photography, no illustration — this is what the software looks like.
export default function HeroMockup() {
  return (
    <div className="relative">
      <div className="card-shadow overflow-hidden rounded-2xl border border-border-strong bg-card">
        <div className="flex items-center justify-between bg-primary px-4 py-3">
          <span className="text-[13px] font-bold text-white">Task #2 · Monthly Pest Control</span>
          <span className="rounded-full bg-steel px-2.5 py-0.5 text-[11px] font-bold text-white">In Progress</span>
        </div>
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Site visit timeline
          </p>

          <div className="mb-3.5 flex gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" />
            <div className="flex-1">
              <p className="mb-0.5 text-[13.5px] font-semibold text-ink">Ravi Segaran · arrived on-site</p>
              <p className="mb-1.5 text-[13px] text-muted-foreground">&ldquo;Starting inspection of basement car park.&rdquo;</p>
              <div className="flex gap-1.5">
                <div className="h-[34px] w-11 rounded bg-muted" />
                <div className="h-[34px] w-11 rounded bg-muted" />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                09:02 AM · 3.0738°N, 101.5834°E · Sunway Geo Residences
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-steel" />
            <div className="flex-1">
              <p className="mb-0.5 text-[13.5px] font-semibold text-ink">Ravi Segaran · treatment applied</p>
              <p className="mb-1.5 text-[13px] text-muted-foreground">
                &ldquo;No termite activity found. Applied preventive barrier.&rdquo;
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">10:15 AM · 3.0741°N, 101.5830°E</p>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-arrive absolute -top-4 right-6 flex items-center gap-1.5 rounded-full border border-border-strong bg-card px-4 py-2 shadow-[0_12px_24px_-12px_rgba(36,52,58,0.3)]">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="text-[12.5px] font-bold text-success">GPS verified</span>
      </div>
    </div>
  );
}
