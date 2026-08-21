import { cn } from '@/lib/utils';
import { scorePassword } from '@/lib/authValidation';

/**
 * Four segments rather than a percentage bar — a discrete scale reads as
 * guidance, where a smooth bar reads as a precise measurement it is not.
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, hint } = scorePassword(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1" role="presentation">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i < score
                ? score <= 1
                  ? 'bg-negative'
                  : score === 2
                    ? 'bg-muted-foreground'
                    : 'bg-positive'
                : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-caption text-muted-foreground" aria-live="polite">
        <span className="font-medium text-foreground">{label}</span>
        {hint && <> · {hint}</>}
      </p>
    </div>
  );
}
