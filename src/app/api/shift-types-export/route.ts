import { NextRequest, NextResponse } from 'next/server';
import { getAllShiftTypesForExport } from '@/server-actions/shift-type';
import * as XLSX from 'xlsx';
import { getServerTranslation } from '@/lib/server-translations';

export async function GET(req: NextRequest) {
  const urlParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { page, limit, format, ...exportParams } = urlParams;
  const exportFormat = (format || 'csv').toLowerCase();

  const shiftTypes = await getAllShiftTypesForExport(exportParams);

  const nameLabel = await getServerTranslation('app', 'name');
  const companyLabel = await getServerTranslation('app', 'company');
  const startTimeLabel = await getServerTranslation('app', 'startTime');
  const endTimeLabel = await getServerTranslation('app', 'endTime');
  const shiftsCountLabel = await getServerTranslation('app', 'shifts');
  const createdAtLabel = await getServerTranslation('app', 'createdAt');

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const records = shiftTypes.map((shiftType) => ({
    [nameLabel]: shiftType.name,
    [companyLabel]: shiftType.company?.name || '',
    [startTimeLabel]: formatTime(shiftType.start_time),
    [endTimeLabel]: formatTime(shiftType.end_time),
    [shiftsCountLabel]: shiftType._count?.shifts || 0,
    [createdAtLabel]: shiftType.created_at,
  }));

  const filename = `shift_types_${new Date().toISOString().slice(0, 10)}`;
  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Shift Types');

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
