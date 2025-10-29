import { NextRequest, NextResponse } from 'next/server';
import { getAllUnavailableDatesForExport } from '@/server-actions/unavailable-date';
import * as XLSX from 'xlsx';
import { getServerTranslation } from '@/lib/server-translations';

export async function GET(req: NextRequest) {
  const urlParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { page, limit, format, ...exportParams } = urlParams;
  const exportFormat = (format || 'csv').toLowerCase();

  const unavailableDates = await getAllUnavailableDatesForExport(exportParams);

  const userLabel = await getServerTranslation('app', 'user');
  const dateRangeLabel = await getServerTranslation('app', 'dateRange');
  const leaveTypeLabel = await getServerTranslation('app', 'leaveType');
  const reasonLabel = await getServerTranslation('app', 'reason');
  const createdAtLabel = await getServerTranslation('app', 'createdAt');

  const getUserDisplayName = (user: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  }) => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.email;
  };

  const getLeaveTypeTranslation = async (leaveType: string) => {
    const keyMap: Record<
      string,
      'sickLeave' | 'vacation' | 'personalLeave' | 'unpaidLeave' | 'other'
    > = {
      SICK_LEAVE: 'sickLeave',
      VACATION: 'vacation',
      PERSONAL_LEAVE: 'personalLeave',
      UNPAID_LEAVE: 'unpaidLeave',
      OTHER: 'other',
    };
    const translationKey = keyMap[leaveType] || 'other';
    return await getServerTranslation('app', translationKey);
  };

  const records = await Promise.all(
    unavailableDates.map(async (unavailableDate) => ({
      [userLabel]: getUserDisplayName(unavailableDate.user),
      [dateRangeLabel]: `${new Date(unavailableDate.start_date).toLocaleDateString()} - ${new Date(unavailableDate.end_date).toLocaleDateString()}`,
      [leaveTypeLabel]: await getLeaveTypeTranslation(
        unavailableDate.leave_type
      ),
      [reasonLabel]: unavailableDate.reason || '',
      [createdAtLabel]: new Date(
        unavailableDate.created_at
      ).toLocaleDateString(),
    }))
  );

  const filename = `unavailable_dates_${new Date().toISOString().slice(0, 10)}`;
  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unavailable Dates');

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
