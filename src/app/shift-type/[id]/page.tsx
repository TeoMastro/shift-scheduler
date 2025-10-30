import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getShiftTypeById } from '@/server-actions/shift-type';
import { ShiftTypePageProps } from '@/types/shift-type';
import { ShiftTypeView } from '@/components/shift-type/shift-type-view';

export default async function ViewShiftTypePage({
  params,
}: ShiftTypePageProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'MANAGER') {
    notFound();
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

  return (
    <div className="container mx-auto py-6">
      <ShiftTypeView shiftType={shiftType} />
    </div>
  );
}
