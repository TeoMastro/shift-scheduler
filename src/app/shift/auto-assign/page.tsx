import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUserForShift } from '@/server-actions/user-has-shift';
import { AutoAssignForm } from '@/components/shift/auto-assign-form';

export default async function AutoAssignPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'MANAGER') {
    notFound();
  }

  const user = await getCurrentUserForShift();

  if (!user) {
    notFound();
  }

  if (user.role === 'MANAGER' && user.company_id === null) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <AutoAssignForm companyId={user.company_id} />
    </div>
  );
}

