import { CompanyForm } from '@/components/admin/company-form';

export default async function CreateCompanyPage() {
  return (
    <div className="container mx-auto py-6">
      <CompanyForm mode="create" />
    </div>
  );
}
