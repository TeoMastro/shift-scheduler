import { UserForm } from '@/components/admin/user-form';
import { getAllCompanies } from '@/server-actions/company';

export default async function CreateUserPage() {
  const companies = await getAllCompanies();

  return (
    <div className="container mx-auto py-6">
      <UserForm mode="create" companies={companies} />
    </div>
  );
}
