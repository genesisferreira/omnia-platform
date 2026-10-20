import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata = {
  title: 'Esqueci minha senha — Omnia Platform',
  description: 'Solicite a recuperação de senha da plataforma Omnia',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <ForgotPasswordForm />
    </div>
  );
}
