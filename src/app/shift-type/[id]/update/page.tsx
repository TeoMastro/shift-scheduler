import { notFound } from 'next/navigation';
import { ShiftTypeForm } from '@/components/admin/shift-type-form';
import { ShiftTypePageProps } from '@/types/shift-type';
import {
  getShiftTypeById,
  getCurrentUserForShiftType,
  getCompaniesForShiftTypeForm,
} from '@/server-actions/shift-type';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function UpdateShiftTypePage({
  params,
}: ShiftTypePageProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const shiftTypeId = parseInt(resolvedParams.id);

  if (isNaN(shiftTypeId)) {
    notFound();
  }

  const shiftType = await getShiftTypeById(shiftTypeId);

  if (!shiftType) {
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
        shiftType={shiftType}
        mode="update"
        companies={companies}
        userRole={user.role}
        userCompanyId={user.company_id}
      />
    </div>
  );
}
