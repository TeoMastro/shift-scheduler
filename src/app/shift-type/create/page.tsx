import { ShiftTypeForm } from '@/components/admin/shift-type-form';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import {
  getCurrentUserForShiftType,
  getCompaniesForShiftTypeForm,
} from '@/server-actions/shift-type';

export default async function CreateShiftTypePage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    notFound();
  }

  const user = await getCurrentUserForShiftType();

  if (!user) {
    notFound();
  }

  const companies = await getCompaniesForShiftTypeForm();

  return (
    <div className="container mx-auto py-6">
      <ShiftTypeForm
        mode="create"
        companies={companies}
        userRole={user.role}
        userCompanyId={user.company_id}
      />
    </div>
  );
}
