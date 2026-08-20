import { Navigate, useParams } from 'react-router-dom';
import { AddExpenseForm } from '@/components/add-expense/AddExpenseForm';
import { useGroupStore } from '@/store/useGroupStore';

export default function AddExpensePage() {
  const { expenseId } = useParams();
  const expense = useGroupStore((s) => s.expenses.find((e) => e.id === expenseId));

  if (expenseId && !expense) return <Navigate to="/expenses" replace />;

  // Keying on the id gives the form a clean slate when switching between
  // creating and editing without unmounting the route.
  return <AddExpenseForm key={expenseId ?? 'new'} expense={expense} />;
}
