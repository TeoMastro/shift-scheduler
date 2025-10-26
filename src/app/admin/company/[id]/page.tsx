import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getCompanyById } from '@/server-actions/company';
import { CompanyPageProps } from '@/types/company';
import { CompanyView } from '@/components/admin/company-view';

export default async function ViewCompanyPage({ params }: CompanyPageProps) {
  const session = await auth();

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const companyId = parseInt(resolvedParams.id);

  if (isNaN(companyId)) {
    notFound();
  }

  const company = await getCompanyById(companyId);

  if (!company) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <CompanyView company={company} />
    </div>
  );
}
