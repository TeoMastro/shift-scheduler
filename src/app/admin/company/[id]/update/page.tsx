import { notFound } from 'next/navigation';
import { CompanyForm } from '@/components/admin/company-form';
import { CompanyPageProps } from '@/types/company';
import { getCompanyById } from '@/server-actions/company';

export default async function UpdateCompanyPage({ params }: CompanyPageProps) {
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
      <CompanyForm
        company={{
          id: company.id,
          name: company.name,
        }}
        mode="update"
      />
    </div>
  );
}
