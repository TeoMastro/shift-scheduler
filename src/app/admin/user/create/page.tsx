import { UserForm } from '@/components/admin/user-form';
import { getCompaniesForUserForm } from '@/server-actions/company';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function CreateUserPage() {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
  ) {
    redirect('/dashboard');
  }

  const companies = await getCompaniesForUserForm();

  return (
    <div className="container mx-auto py-6">
      <UserForm mode="create" companies={companies} />
    </div>
  );
}
