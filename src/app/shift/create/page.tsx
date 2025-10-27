import { ShiftForm } from '@/components/shift/shift-form';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import {
  getCurrentUserForShift,
  getUsersForShiftForm,
  getShiftTypesForShiftForm,
} from '@/server-actions/user-has-shift';

export default async function CreateShiftPage() {
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

  const users = await getUsersForShiftForm();
  const shiftTypes = await getShiftTypesForShiftForm();

  return (
    <div className="container mx-auto py-6">
      <ShiftForm
        mode="create"
        users={users}
        shiftTypes={shiftTypes}
        userRole={user.role}
        userCompanyId={user.company_id}
      />
    </div>
  );
}

