// The "Snap Frame" brand mark — two camera-viewfinder corners around a dot,
// reading as both "photo capture" and "pin drop" (GPS) without spelling
// either out literally. Self-contained (own iron-grey background), so it
// looks right regardless of what it's placed on.
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#24343A" />
      <path
        d="M22,38 L22,22 L38,22"
        stroke="#FFFFFF"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M78,62 L78,78 L62,78"
        stroke="#FFFFFF"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="13" fill="#A9CEF4" />
    </svg>
  );
}
