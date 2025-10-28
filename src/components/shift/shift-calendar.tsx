'use client';

import { useTranslations } from 'next-intl';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserHasShift } from '@/types/user-has-shift';
import { format } from 'date-fns';
import { useState } from 'react';

interface ShiftCalendarProps {
  shifts: UserHasShift[];
}

export function ShiftCalendar({ shifts }: ShiftCalendarProps) {
  const t = useTranslations('app');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Map shifts by date for easy lookup
  const shiftsByDate = shifts.reduce(
    (acc, shift) => {
      const dateKey = format(new Date(shift.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(shift);
      return acc;
    },
    {} as Record<string, UserHasShift[]>
  );

  // Get shifts for selected date
  const selectedDateKey = selectedDate
    ? format(selectedDate, 'yyyy-MM-dd')
    : null;
  const shiftsForSelectedDate = selectedDateKey
    ? shiftsByDate[selectedDateKey] || []
    : [];

  // Format time for display
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm');
  };

  // Get user display name
  const getUserDisplayName = (user: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  }) => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.email;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('myShifts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Calendar */}
            <div className="flex-shrink-0">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>

            {/* Shift Details */}
            <div className="flex-1">
              {selectedDate ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </h3>

                  {shiftsForSelectedDate.length > 0 ? (
                    <div className="space-y-3">
                      {shiftsForSelectedDate.map((shift) => (
                        <Card
                          key={shift.id}
                          className="border-l-4 border-l-primary"
                        >
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {t('shiftType')}
                                </p>
                                <p className="font-semibold">
                                  {shift.shift_type?.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {t('status')}
                                </p>
                                <Badge variant="outline" className="mt-1">
                                  {t(shift.status.toLowerCase())}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {t('startTime')}
                                </p>
                                <p className="font-medium">
                                  {shift.shift_type?.start_time &&
                                    formatTime(shift.shift_type.start_time)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {t('endTime')}
                                </p>
                                <p className="font-medium">
                                  {shift.shift_type?.end_time &&
                                    formatTime(shift.shift_type.end_time)}
                                </p>
                              </div>
                              {shift.user && (
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    {t('user')}
                                  </p>
                                  <p className="font-medium">
                                    {getUserDisplayName(shift.user)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {t('noShiftsOnThisDay')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>{t('selectDateToViewShifts')}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
