import Link from 'next/link';

// variant: primary | ghost | icon (also secondary | danger). Icon buttons need an aria-label.
export default function Button({ variant = 'primary', size, href, className = '', type = 'button', children, ...rest }) {
  const cls = ['btn', `btn--${variant}`, size && `btn--${size}`, className].filter(Boolean).join(' ');
  if (href) return <Link href={href} className={cls} {...rest}>{children}</Link>;
  return <button type={type} className={cls} {...rest}>{children}</button>;
}
