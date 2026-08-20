import { Navigate, useParams } from 'react-router-dom';
import { PersonDetail } from '@/components/people/PersonDetail';
import { useGroupStore } from '@/store/useGroupStore';

export default function PersonDetailPage() {
  const { personId } = useParams();
  const person = useGroupStore((s) => s.people.find((p) => p.id === personId));

  if (!person) return <Navigate to="/people" replace />;
  return <PersonDetail person={person} />;
}
