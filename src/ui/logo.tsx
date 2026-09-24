// The Wrapbox mark — drawn exactly as in the main prototype's brand files:
// a box, the wrapping seal, and the verified tick.
import { useId } from "react";

export function WrapboxLogo({ size = 30, tone = "light" }: { size?: number; tone?: "dark" | "light" }) {
  const id = useId().replace(/:/g, "");
  const ink = tone === "dark" ? "#ffffff" : "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        color: "var(--fg)",
        filter: tone === "dark" ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" : "drop-shadow(0 2px 6px rgba(24,72,255,0.18))",
      }}
    >
      <defs>
        <linearGradient id={`wbg-${id}`} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor={tone === "dark" ? "#9db6ff" : "#5a82ff"} />
          <stop offset="1" stopColor={tone === "dark" ? "#4f7bff" : "#1848ff"} />
        </linearGradient>
      </defs>
      <rect x="9" y="9" width="22" height="22" rx="6" stroke={`url(#wbg-${id})`} strokeWidth="2.4" />
      <path d="M20 4 H30 a6 6 0 0 1 6 6 V20" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M15 20.5 l3.5 3.5 L26 16" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo + "Wrapbox" in ink — the brand wordmark lockup. */
export function WrapboxWordmark({ tone = "light", size = 18 }: { tone?: "dark" | "light"; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 11, userSelect: "none" }}>
      <WrapboxLogo size={Math.round(size * 1.67)} tone={tone} />
      <span
        style={{
          fontFamily: "var(--brandfont)",
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "-0.3px",
          color: tone === "dark" ? "#fff" : "var(--fg)",
          lineHeight: 1,
        }}
      >
        Wrapbox
      </span>
    </span>
  );
}
