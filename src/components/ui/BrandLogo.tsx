/**
 * BrandLogo — reusable Origin.ai logo component.
 * Use `size` to control dimensions consistently across all pages.
 * The `rounded` prop controls border-radius (default: rounded-xl for squircle feel).
 */
interface BrandLogoProps {
  /** Tailwind size class for the wrapper, e.g. "h-8 w-8" or "h-10 w-10" */
  size?: string;
  /** Tailwind rounded class, e.g. "rounded-xl" or "rounded-2xl" */
  rounded?: string;
  className?: string;
}

export function BrandLogo({
  size = "h-8 w-8",
  rounded = "rounded-xl",
  className = "",
}: BrandLogoProps) {
  return (
    <div className={`${size} ${rounded} overflow-hidden flex-shrink-0 ${className}`}>
      <img
        src="/origin-logo.png"
        alt="Origin.ai logo"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
