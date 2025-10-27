import { NextRequest, NextResponse } from 'next/server';
import { getAllShiftsForExport } from '@/server-actions/user-has-shift';
import * as XLSX from 'xlsx';
import { getServerTranslation } from '@/lib/server-translations';

export async function GET(req: NextRequest) {
  const urlParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { page, limit, format, ...exportParams } = urlParams;
  const exportFormat = (format || 'csv').toLowerCase();

  const shifts = await getAllShiftsForExport(exportParams);

  const userLabel = await getServerTranslation('app', 'user');
  const shiftTypeLabel = await getServerTranslation('app', 'shiftType');
  const dateLabel = await getServerTranslation('app', 'date');
  const statusLabel = await getServerTranslation('app', 'status');
  const createdAtLabel = await getServerTranslation('app', 'createdAt');

  const getUserDisplayName = (user: { first_name: string | null; last_name: string | null; email: string }) => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.email;
  };

  const records = shifts.map((shift) => ({
    [userLabel]: getUserDisplayName(shift.user!),
    [shiftTypeLabel]: shift.shift_type?.name || '',
    [dateLabel]: new Date(shift.date).toLocaleDateString(),
    [statusLabel]: shift.status,
    [createdAtLabel]: shift.created_at,
  }));

  const filename = `shifts_${new Date().toISOString().slice(0, 10)}`;
  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Shifts');

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

