import { SkillForm } from '@/components/skill/skill-form';
import { getCompaniesForSkillForm } from '@/server-actions/skill';

export default async function CreateSkillPage() {
  const companies = await getCompaniesForSkillForm();

  return (
    <div className="container mx-auto py-6">
      <SkillForm mode="create" companies={companies} />
    </div>
  );
}

