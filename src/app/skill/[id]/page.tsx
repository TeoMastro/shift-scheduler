import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { SkillView } from '@/components/skill/skill-view';
import { getSkillById } from '@/server-actions/skill';
import { PageProps } from '@/types/skill';

export default async function ViewSkillPage({ params }: PageProps) {
  const session = await auth();

  if (!session || session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const skillId = parseInt(resolvedParams.id);

  if (isNaN(skillId)) {
    notFound();
  }

  const skill = await getSkillById(skillId);

  if (!skill || typeof skill === 'boolean') {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <SkillView skill={skill} />
    </div>
  );
}
