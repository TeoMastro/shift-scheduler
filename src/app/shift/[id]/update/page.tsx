import { notFound } from 'next/navigation';
import { ShiftForm } from '@/components/shift/shift-form';
import { UserHasShiftPageProps } from '@/types/user-has-shift';
import {
  getShiftById,
  getCurrentUserForShift,
  getUsersForShiftForm,
  getShiftTypesForShiftForm,
} from '@/server-actions/user-has-shift';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function UpdateShiftPage({
  params,
}: UserHasShiftPageProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const shiftId = parseInt(resolvedParams.id);

  if (isNaN(shiftId)) {
    notFound();
  }

  const shift = await getShiftById(shiftId);

  if (!shift) {
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
        shift={shift}
        mode="update"
        users={users}
        shiftTypes={shiftTypes}
        userRole={user.role}
        userCompanyId={user.company_id}
      />
    </div>
  );
}
