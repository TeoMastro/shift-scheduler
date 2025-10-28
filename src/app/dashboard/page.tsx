import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Status } from '@prisma/client';
import { getUserShiftsForCalendar } from '@/server-actions/user-has-shift';
import { ShiftCalendar } from '@/components/shift/shift-calendar';

export default async function DashboardPage() {
  const session = await auth();

  if (!session || session?.user.status !== Status.ACTIVE) {
    redirect('/auth/signin');
  }

  // Fetch shifts for the calendar
  const shifts = await getUserShiftsForCalendar();

  return (
    <div className="container mx-auto py-6">
      <ShiftCalendar shifts={shifts} />
    </div>
  );
}
