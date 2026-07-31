"use client";

// Last-resort fallback if the root layout itself fails to render (rare —
// e.g. a font-loading error). Must render its own <html>/<body> since it
// replaces the root layout entirely when active, so it can't use the
// design-token CSS (globals.css may not have loaded) — kept intentionally
// plain and dependency-free.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", background: "#0e0f11", color: "#f2f2f2" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 24,
          }}
        >
          <div>
            <h1 style={{ marginBottom: 8, fontSize: 20, fontWeight: 700 }}>Something went wrong</h1>
            <p style={{ marginBottom: 20, fontSize: 14, color: "#9ba1a6" }}>
              JobSnap couldn&apos;t load. Please refresh the page.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "#4c7a94",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
