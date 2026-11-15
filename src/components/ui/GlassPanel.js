export default function GlassPanel({ as: Tag = 'div', padded = true, className = '', children, ...rest }) {
  return (
    <Tag className={['glass-panel', padded && 'glass-panel--padded', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  );
}
