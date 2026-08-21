import { Link } from 'react-router-dom';
import { AuthCard } from '@/components/auth/AuthCard';

/**
 * Placeholder. Phase 3 replaces this with the security-question recovery flow
 * from PRD 5.1 Option A; the route exists now so the sign-in link is not dead.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="In-app recovery, no email required"
      footer={
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <p className="text-body text-muted-foreground">
        Password recovery through security questions is being built next. If you are locked out
        right now, signing in with Google will get you back into your account.
      </p>
    </AuthCard>
  );
}
