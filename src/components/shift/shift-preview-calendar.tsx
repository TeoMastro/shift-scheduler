'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShiftAssignment } from '@/lib/solution-parser';
import { format } from 'date-fns';
import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface ShiftPreviewCalendarProps {
  assignments: ShiftAssignment[];
  isLoading?: boolean;
}

export function ShiftPreviewCalendar({
  assignments,
  isLoading = false,
}: ShiftPreviewCalendarProps) {
  const t = useTranslations('app');

  // Transform assignments to FullCalendar events
  const events = useMemo(() => {
    return assignments.map((assignment, index) => {
      // Generate a color for each unique employee
      const employeeHash = assignment.employeeName
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colors = [
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#06b6d4', // cyan
        '#84cc16', // lime
      ];
      const color = colors[employeeHash % colors.length];

      return {
        id: assignment.id || `shift-${index}`,
        title: `${assignment.employeeName}${
          assignment.requiredSkill ? ` - ${assignment.requiredSkill}` : ''
        }`,
        start: assignment.start.toISOString(),
        end: assignment.end.toISOString(),
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          location: assignment.location,
          skill: assignment.requiredSkill,
          employee: assignment.employeeName,
        },
      };
    });
  }, [assignments]);

  // Get the first assignment date for initialDate, or use today
  const initialDate = useMemo(() => {
    if (assignments.length > 0) {
      return format(assignments[0].start, 'yyyy-MM-dd');
    }
    return format(new Date(), 'yyyy-MM-dd');
  }, [assignments]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('previewShifts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">
                {t('assignmentInProgress')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('previewShifts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('noAssignmentsYet')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('previewShifts')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {assignments.length} {t('shifts').toLowerCase()} assigned
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            initialDate={initialDate}
            events={events}
            height="auto"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            allDaySlot={false}
            weekends={true}
            editable={false}
            selectable={false}
            dayMaxEvents={true}
            eventDisplay="block"
            eventContent={(eventInfo) => {
              return (
                <div className="p-1">
                  <div className="font-medium text-xs truncate">
                    {eventInfo.event.title}
                  </div>
                  {eventInfo.event.extendedProps.location && (
                    <div className="text-xs text-muted-foreground truncate">
                      📍 {eventInfo.event.extendedProps.location}
                    </div>
                  )}
                </div>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
