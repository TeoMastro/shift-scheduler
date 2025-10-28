import { NextRequest, NextResponse } from 'next/server';
import { getAllSkillsForExport } from '@/server-actions/skill';
import * as XLSX from 'xlsx';
import { getServerTranslation } from '@/lib/server-translations';

export async function GET(req: NextRequest) {
  const urlParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { page, limit, format, ...exportParams } = urlParams;
  const exportFormat = (format || 'csv').toLowerCase();

  const skills = await getAllSkillsForExport(exportParams);

  const nameLabel = await getServerTranslation('app', 'name');
  const companyLabel = await getServerTranslation('app', 'company');
  const usersCountLabel = await getServerTranslation('app', 'usersCount');
  const createdAtLabel = await getServerTranslation('app', 'createdAt');
  const updatedAtLabel = await getServerTranslation('app', 'updatedAt');

  const records = skills.map((skill) => ({
    [nameLabel]: skill.name,
    [companyLabel]: skill.company.name,
    [usersCountLabel]: skill._count.users,
    [createdAtLabel]: skill.created_at,
    [updatedAtLabel]: skill.updated_at,
  }));

  const filename = `skills_${new Date().toISOString().slice(0, 10)}`;
  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Skills');

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
