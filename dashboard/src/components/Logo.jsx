// Shelf153 mark: a shelving unit with goods on it. Same drawing as the storefront logo.
export const ShelfMark = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="3" y1="16.5" x2="21" y2="16.5" />
    <rect x="5.75" y="5.25" width="3.5" height="3.25" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="13.25" y="5.25" width="5" height="3.25" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="5.75" y="11.75" width="5" height="3.25" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="14.5" y="11.75" width="3.75" height="3.25" rx="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const sizes = {
  sm: { box: "w-8 h-8 rounded-lg", mark: "w-[1.125rem] h-[1.125rem]", text: "text-lg" },
  md: { box: "w-10 h-10 rounded-xl", mark: "w-5 h-5", text: "text-xl" },
  lg: { box: "w-14 h-14 rounded-2xl", mark: "w-8 h-8", text: "text-3xl" },
};

const Logo = ({ size = "md", showText = true, light = false, className = "" }) => {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`${s.box} flex items-center justify-center shrink-0 ${light ? "bg-white text-green-700" : "bg-green-700 text-white"}`}>
        <ShelfMark className={s.mark} />
      </span>
      {showText && (
        <span className={`${s.text} font-extrabold tracking-tight ${light ? "text-white" : "text-gray-900"}`}>
          Shelf<span className={light ? "text-green-200" : "text-green-700"}>153</span>
        </span>
      )}
    </span>
  );
};

export default Logo;
