import HalftoneField from '@/components/home/HalftoneField';
import '@/components/home/guest-home.css';

export default function AuthLayout({ children }) {
  return (
    <main>
      <HalftoneField variant="auth">{children}</HalftoneField>
    </main>
  );
}
