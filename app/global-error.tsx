"use client";

/**
 * Required client boundary for Next.js root error recovery.
 * Without this file, Turbopack can fail to resolve the builtin global-error
 * module in the React Client Manifest after aggressive HMR.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#08090a",
          color: "#d0d6e0",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#8a8f98" }}>
            Something went wrong
          </p>
          <p style={{ margin: "12px 0 20px", fontSize: 15, lineHeight: 1.5 }}>
            {error.message || "The app hit an unexpected error."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#5e6ad2",
              color: "#fff",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
