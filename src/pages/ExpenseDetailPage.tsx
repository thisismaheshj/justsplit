import { Navigate, useParams } from 'react-router-dom';
import { ExpenseDetail } from '@/components/expenses/ExpenseDetail';
import { useGroupStore } from '@/store/useGroupStore';

export default function ExpenseDetailPage() {
  const { expenseId } = useParams();
  const expense = useGroupStore((s) => s.expenses.find((e) => e.id === expenseId));

  if (!expense) return <Navigate to="/expenses" replace />;
  return <ExpenseDetail expense={expense} />;
}
