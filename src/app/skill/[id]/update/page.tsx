import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { SkillForm } from '@/components/skill/skill-form';
import { getSkillById, getCompaniesForSkillForm } from '@/server-actions/skill';
import { PageProps } from '@/types/skill';

export default async function UpdateSkillPage({ params }: PageProps) {
  const session = await auth();

  if (!session || session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const skillId = parseInt(resolvedParams.id);

  if (isNaN(skillId)) {
    notFound();
  }

  const [skill, companies] = await Promise.all([
    getSkillById(skillId),
    getCompaniesForSkillForm(),
  ]);

  if (!skill || typeof skill === 'boolean') {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <SkillForm mode="update" skill={skill} companies={companies} />
    </div>
  );
}

