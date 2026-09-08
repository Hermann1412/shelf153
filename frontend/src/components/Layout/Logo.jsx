import { Link } from "react-router-dom";

const ShelfMark = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* shelving unit frame */}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="3" y1="16.5" x2="21" y2="16.5" />
    {/* goods sitting on the shelves */}
    <rect x="5.75" y="5.25" width="3.5" height="3.25" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="13.25" y="5.25" width="5" height="3.25" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="5.75" y="11.75" width="5" height="3.25" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="14.5" y="11.75" width="3.75" height="3.25" rx="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const Logo = ({ className = "", textClassName = "text-2xl" }) => (
  <Link to="/" className={`flex items-center gap-2.5 shrink-0 ${className}`}>
    <span className="flex items-center justify-center w-9 h-9 rounded-xl gradient-primary shadow-[var(--shadow-glow)]">
      <ShelfMark className="w-5 h-5 text-white" />
    </span>
    <span
      className={`${textClassName} font-bold gradient-primary bg-clip-text text-transparent`}
    >
      Shelf153
    </span>
  </Link>
);

export default Logo;
