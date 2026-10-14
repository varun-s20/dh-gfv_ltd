"use client";

/** Last-resort boundary when the root layout itself fails. Inline styles only. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#050607", color: "#efede8", fontFamily: "Helvetica Neue, Arial, sans-serif" }}>
        <div style={{ padding: 24, maxWidth: 520, textAlign: "center" }}>
          <h1 style={{ fontWeight: 600, fontSize: 36, letterSpacing: "-0.02em", margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#a7aaaf", lineHeight: 1.6 }}>Please refresh the page, or call us and we&apos;ll help.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 22px", borderRadius: 16, border: 0, background: "#efede8", color: "#050607", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
