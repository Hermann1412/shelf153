import { Link } from "react-router-dom";

export const ShelfMark = ({ className = "" }) => (
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

// Brand mark: the shopping net bag on a dark tile (the net is cream, so it needs a dark background).
export const BrandMark = ({ className = "" }) => (
  <span className={`inline-flex shrink-0 items-center justify-center bg-[#13241a] ${className}`}>
    <img src="/logo.png" alt="" className="h-[82%] w-auto" />
  </span>
);

const Logo = ({ className = "", textClassName = "text-2xl" }) => (
  <Link to="/" aria-label="Tinkli Shelf153" className={`flex items-center gap-2 shrink-0 ${className}`}>
    <BrandMark className="w-9 h-9 rounded-lg" />
    <span className={`${textClassName} font-extrabold tracking-tight text-foreground`}>
      Shelf<span className="text-primary">153</span>
    </span>
  </Link>
);

export default Logo;
