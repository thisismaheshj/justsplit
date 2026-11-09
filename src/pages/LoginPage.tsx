import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleSignIn } from '@/components/auth/GoogleButton';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Google is the only way in. It creates the account on first use, so signing
 * in and signing up are the same button. Accounts made earlier with an email
 * and password get Google attached automatically when the addresses match.
 */
export default function LoginPage() {
  const error = useAuthStore((s) => s.error);

  return (
    <AuthCard
      title="Welcome"
      subtitle="Track shared expenses with friends, and settle up"
      error={error}
      footer="New here? Continuing with Google creates your account."
    >
      <GoogleSignIn />
    </AuthCard>
  );
}
