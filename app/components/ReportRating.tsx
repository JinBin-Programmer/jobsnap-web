"use client";

import { useState } from "react";
import { submitReportRating } from "@/app/r/[token]/actions";

interface ReportRatingProps {
  token: string;
  initialRating: number | null;
  initialFeedback: string | null;
}

// Client satisfaction rating on the public report page — no login needed,
// same trust model as the rest of that page. Star tap submits immediately;
// the optional feedback note saves on blur so there's no separate "Submit"
// button standing between a client and giving quick feedback.
export default function ReportRating({ token, initialRating, initialFeedback }: ReportRatingProps) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(initialRating != null);

  const handleRate = async (value: number) => {
    setRating(value);
    setSubmitting(true);
    try {
      await submitReportRating(token, value, feedback);
      setSaved(true);
    } catch {
      // best-effort — a rating failure shouldn't block viewing the report
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackBlur = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    try {
      await submitReportRating(token, rating, feedback);
      setSaved(true);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-border bg-muted p-5 print:hidden">
      <p className="mb-2 text-sm font-semibold text-ink">How was this job?</p>
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => handleRate(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="text-2xl leading-none"
          >
            <span style={{ color: (hoverRating || rating) >= n ? "var(--priority-high)" : "var(--border-strong)" }}>
              ★
            </span>
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onBlur={handleFeedbackBlur}
            placeholder="Anything you'd like to add? (optional)"
            rows={2}
            className="w-full rounded-lg border border-input bg-card p-2.5 text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {submitting ? "Saving…" : saved ? "Thanks for your feedback!" : ""}
          </p>
        </>
      )}
    </div>
  );
}
