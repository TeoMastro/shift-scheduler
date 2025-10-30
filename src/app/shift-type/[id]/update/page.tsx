import { notFound } from 'next/navigation';
import { ShiftTypeForm } from '@/components/shift-type/shift-type-form';
import { ShiftTypePageProps } from '@/types/shift-type';
import {
  getShiftTypeById,
  getCurrentUserForShiftType,
  getSkillsForShiftTypeForm,
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

  const user = await getCurrentUserForShiftType();

  if (!user) {
    notFound();
  }

  const skills = await getSkillsForShiftTypeForm();
  const selectedSkillIds = (shiftType.skills || []).map((s) => s.skill_id);

  return (
    <div className="container mx-auto py-6">
      <ShiftTypeForm
        shiftType={shiftType}
        mode="update"
        availableSkills={skills}
        selectedSkillIds={selectedSkillIds}
      />
    </div>
  );
}
