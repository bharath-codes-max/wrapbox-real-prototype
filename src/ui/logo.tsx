// The Wrapbox brand mark and wordmark — the real logo file. `tone="light"`
// renders the ink-on-light version (black + green); `tone="dark"` renders the
// white-ink version for dark surfaces. The green never changes between them.
import mark from "../assets/brand/wrapbox-mark.png";
import markWhite from "../assets/brand/wrapbox-mark-white.png";
import lockup from "../assets/brand/wrapbox-logo.png";
import lockupWhite from "../assets/brand/wrapbox-logo-white.png";

// Intrinsic aspect ratios of the source files (width ÷ height), so `size`
// (a height, matching every existing call site) yields the right width.
const MARK_RATIO = 415 / 256;
const LOCKUP_RATIO = 2000 / 325;

/** The "W" mark alone — for tab favicons, app-icon chips, small badges. */
export function WrapboxLogo({ size = 30, tone = "light", style }: { size?: number; tone?: "dark" | "light"; style?: React.CSSProperties }) {
  return (
    <img
      src={tone === "dark" ? markWhite : mark}
      alt="Wrapbox"
      width={Math.round(size * MARK_RATIO)}
      height={size}
      style={{ flexShrink: 0, display: "block", objectFit: "contain", ...style }}
    />
  );
}

/** The full lockup — mark + lowercase "wrapbox" wordmark, as one image. */
export function WrapboxWordmark({ tone = "light", size = 18 }: { tone?: "dark" | "light"; size?: number }) {
  // `size` has historically been a text-size figure (≈18 in the nav); the
  // full lockup reads at roughly 1.9× that as a height.
  const h = Math.round(size * 1.9);
  return (
    <img
      src={tone === "dark" ? lockupWhite : lockup}
      alt="Wrapbox"
      width={Math.round(h * LOCKUP_RATIO)}
      height={h}
      style={{ flexShrink: 0, display: "block", objectFit: "contain" }}
    />
  );
}
