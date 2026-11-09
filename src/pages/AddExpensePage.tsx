import { Navigate, useParams } from 'react-router-dom';
import { AddExpenseForm } from '@/components/add-expense/AddExpenseForm';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuthStore } from '@/store/useAuthStore';
import { expenseAccess } from '@/lib/expenseAccess';

export default function AddExpensePage() {
  const { expenseId } = useParams();
  const expense = useGroupStore((s) => s.expenses.find((e) => e.id === expenseId));

  const userId = useAuthStore((s) => s.user?.id);

  if (expenseId && !expense) return <Navigate to="/expenses" replace />;
  // An old link or a typed URL: only the adder may edit, and only twice.
  if (expense && !expenseAccess(expense, userId).canEdit) {
    return <Navigate to={`/expenses/${expense.id}`} replace />;
  }

  // Keying on the id gives the form a clean slate when switching between
  // creating and editing without unmounting the route.
  return <AddExpenseForm key={expenseId ?? 'new'} expense={expense} />;
}
