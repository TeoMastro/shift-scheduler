import { notFound, redirect } from 'next/navigation';
import { UserForm } from '@/components/admin/user-form';
import { PageProps } from '@/types/user';
import { getUserById, getUserSkills } from '@/server-actions/user';
import { getCompaniesForUserForm } from '@/server-actions/company';
import { auth } from '@/lib/auth';

export default async function UpdateUserPage({ params }: PageProps) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
  ) {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id);

  if (isNaN(userId)) {
    notFound();
  }

  try {
    const user = await getUserById(userId);

    if (!user) {
      notFound();
    }

    // Fetch user's skills
    const userSkills = await getUserSkills(userId);

    const companies = await getCompaniesForUserForm();

    return (
      <div className="container mx-auto py-6">
        <UserForm
          user={{ ...user, skills: userSkills }}
          mode="update"
          companies={companies}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
