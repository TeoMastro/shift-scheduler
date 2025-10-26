import { NextRequest, NextResponse } from 'next/server';
import { getAllCompaniesForExport } from '@/server-actions/company';
import * as XLSX from 'xlsx';
import { getServerTranslation } from '@/lib/server-translations';

export async function GET(req: NextRequest) {
  const urlParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { page, limit, format, ...exportParams } = urlParams;
  const exportFormat = (format || 'csv').toLowerCase();

  const companies = await getAllCompaniesForExport(exportParams);

  const nameLabel = await getServerTranslation('app', 'name');
  const usersCountLabel = await getServerTranslation('app', 'users');
  const shiftTypesCountLabel = await getServerTranslation('app', 'shiftTypes');
  const createdAtLabel = await getServerTranslation('app', 'createdAt');

  const records = companies.map((company) => ({
    [nameLabel]: company.name,
    [usersCountLabel]: company._count?.users || 0,
    [shiftTypesCountLabel]: company._count?.shift_types || 0,
    [createdAtLabel]: company.created_at,
  }));

  const filename = `companies_${new Date().toISOString().slice(0, 10)}`;
  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

  if (exportFormat === 'xlsx') {
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  } else {
    const csvString = XLSX.write(workbook, { type: 'string', bookType: 'csv' });
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvString;
    const buffer = Buffer.from(csvWithBOM, 'utf8');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }
}
