import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getShiftById } from '@/server-actions/user-has-shift';
import { UserHasShiftPageProps } from '@/types/user-has-shift';
import { ShiftView } from '@/components/shift/shift-view';

export default async function ViewShiftPage({ params }: UserHasShiftPageProps) {
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

  return (
    <div className="container mx-auto py-6">
      <ShiftView shift={shift} />
    </div>
  );
}

