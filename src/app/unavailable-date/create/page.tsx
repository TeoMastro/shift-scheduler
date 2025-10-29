import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UnavailableDateForm } from '@/components/unavailable-dates/unavailable-date-form';
import { getUsersForUnavailableDateForm } from '@/server-actions/unavailable-date';

export default async function CreateUnavailableDatePage() {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'EMPLOYEE')
  ) {
    redirect('/dashboard');
  }

  const isEmployee = session.user.role === 'EMPLOYEE';

  const users = isEmployee ? [] : await getUsersForUnavailableDateForm();

  return (
    <div className="container mx-auto py-6">
      <UnavailableDateForm
        mode="create"
        users={users}
        currentUserId={isEmployee ? +session.user.id : undefined}
        isEmployee={isEmployee}
      />
    </div>
  );
}
