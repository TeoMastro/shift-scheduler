import { ShiftTypeForm } from '@/components/shift-type/shift-type-form';
import { auth } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import {
  getCurrentUserForShiftType,
  getSkillsForShiftTypeForm,
} from '@/server-actions/shift-type';

export default async function CreateShiftTypePage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'MANAGER') {
    notFound();
  }

  const user = await getCurrentUserForShiftType();

  if (!user) {
    notFound();
  }

  const skills = await getSkillsForShiftTypeForm();

  return (
    <div className="container mx-auto py-6">
      <ShiftTypeForm mode="create" availableSkills={skills} />
    </div>
  );
}
