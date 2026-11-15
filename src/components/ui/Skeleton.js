// Loading placeholder. Decorative, so hidden from assistive tech.
export default function Skeleton({ width, height = 16, radius, className = '', style, ...rest }) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
      {...rest}
    />
  );
}
