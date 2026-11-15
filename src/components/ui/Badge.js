// tone: neutral | accent | info | easy | medium | hard | success | danger
export default function Badge({ tone = 'neutral', className = '', children, ...rest }) {
  return <span className={`badge badge--${tone} ${className}`} {...rest}>{children}</span>;
}
