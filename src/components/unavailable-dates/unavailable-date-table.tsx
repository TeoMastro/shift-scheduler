'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteUnavailableDateAction } from '@/server-actions/unavailable-date';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Eye, X, Download } from 'lucide-react';
import { Pagination } from '../layout/pagination';
import {
  SortableTableHeader,
  SortField,
} from '../layout/sortable-table-header';
import { LeaveType } from '@prisma/client';
import { UnavailableDatesTableProps } from '@/types/unavailable-date';
import { InfoAlert } from '@/components/info-alert';

export const getLeaveTypeBadge = (
  type: LeaveType,
  t: (key: string) => string
) => {
  switch (type) {
    case LeaveType.SICK_LEAVE:
      return {
        variant: 'destructive' as const,
        text: t('sickLeave'),
      };
    case LeaveType.VACATION:
      return {
        variant: 'default' as const,
        text: t('vacation'),
      };
    case LeaveType.PERSONAL_LEAVE:
      return {
        variant: 'secondary' as const,
        text: t('personalLeave'),
      };
    case LeaveType.UNPAID_LEAVE:
      return {
        variant: 'outline' as const,
        text: t('unpaidLeave'),
      };
    case LeaveType.OTHER:
      return {
        variant: 'outline' as const,
        text: t('other'),
      };
    default:
      return {
        variant: 'secondary' as const,
        text: type,
      };
  }
};

export function UnavailableDatesTable({
  unavailableDates,
  totalCount,
  totalPages,
  currentPage,
  limit,
  sortField,
  sortDirection,
  userFilter,
  leaveTypeFilter,
  isEmployee = false,
  users = [],
}: UnavailableDatesTableProps) {
  // Ensure isEmployee is a boolean
  const isEmployeeUser = Boolean(isEmployee);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('app');

  const [isPending, startTransition] = useTransition();
  const [deletingUnavailableDateId, setDeletingUnavailableDateId] = useState<
    number | null
  >(null);
  const [alert, setAlert] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  const message = searchParams.get('message');

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const current = new URLSearchParams(searchParams);
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          current.set(key, value);
        } else {
          current.delete(key);
        }
      });
      router.push(`${pathname}?${current.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      const newDirection =
        sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';

      updateUrl({
        sortField: field,
        sortDirection: newDirection,
        page: '1',
      });
    },
    [sortField, sortDirection, updateUrl]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateUrl({ page: page.toString() });
    },
    [updateUrl]
  );

  const handleDelete = async (unavailableDateId: number) => {
    setDeletingUnavailableDateId(unavailableDateId);

    startTransition(async () => {
      try {
        await deleteUnavailableDateAction(unavailableDateId);
        setAlert({
          message: t('unavailableDateDeletedSuccess'),
          type: 'success',
        });
      } catch (error) {
        setAlert({
          message:
            error instanceof Error ? t(error.message) : t('unexpectedError'),
          type: 'error',
        });
      } finally {
        setDeletingUnavailableDateId(null);
      }
    });
  };

  const exportFilteredUnavailableDates = useCallback(
    async (format: 'csv' | 'xlsx') => {
      try {
        const params = new URLSearchParams({
          userFilter: userFilter !== 'all' ? userFilter : '',
          leaveTypeFilter: leaveTypeFilter !== 'all' ? leaveTypeFilter : '',
          sortField: sortField || 'created_at',
          sortDirection: sortDirection || 'desc',
          format,
        });

        const response = await fetch(
          `/api/unavailable-dates-export?${params.toString()}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `unavailable_dates_export_${new Date()
          .toISOString()
          .slice(0, 10)}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        setAlert({
          message: t('exportError'),
          type: 'error',
        });
      }
    },
    [
      userFilter,
      leaveTypeFilter,
      sortField,
      sortDirection,
      t,
    ]
  );

  const handleResetFilters = useCallback(() => {
    updateUrl({
      userFilter: 'all',
      leaveTypeFilter: 'all',
      page: '1',
    });
  }, [updateUrl]);

  const hasActiveFilters =
    userFilter !== 'all' ||
    leaveTypeFilter !== 'all';

  const getUserDisplayName = (user: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  }) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const end = new Date(endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (start === end) {
      return start;
    }
    return `${start} - ${end}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('unavailableDates')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportFilteredUnavailableDates('csv')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .csv
          </Button>
          <Button
            onClick={() => exportFilteredUnavailableDates('xlsx')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .xlsx
          </Button>
          <Button onClick={() => router.push('/unavailable-date/create')}>
            <Plus className="h-4 w-4" />
            <div className="hidden md:block">{t('create')}</div>
          </Button>
        </div>
      </div>

      {message && <InfoAlert message={t(message) as string} type="success" />}

      {alert && <InfoAlert message={alert.message} type={alert.type} />}

      <div className="flex flex-col md:flex-row gap-4">
        {!isEmployeeUser && (
          <Select
            value={userFilter}
            onValueChange={(value) =>
              updateUrl({ userFilter: value, page: '1' })
            }
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t('filterByUser')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allUsers')}</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {getUserDisplayName(user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={leaveTypeFilter}
          onValueChange={(value) =>
            updateUrl({ leaveTypeFilter: value, page: '1' })
          }
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder={t('filterByLeaveType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allLeaveTypes')}</SelectItem>
            <SelectItem value={LeaveType.SICK_LEAVE}>
              {t('sickLeave')}
            </SelectItem>
            <SelectItem value={LeaveType.VACATION}>{t('vacation')}</SelectItem>
            <SelectItem value={LeaveType.PERSONAL_LEAVE}>
              {t('personalLeave')}
            </SelectItem>
            <SelectItem value={LeaveType.UNPAID_LEAVE}>
              {t('unpaidLeave')}
            </SelectItem>
            <SelectItem value={LeaveType.OTHER}>{t('other')}</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="whitespace-nowrap"
          >
            <X className="mr-2 h-4 w-4" />
            {t('resetFilters')}
          </Button>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {!isEmployeeUser && (
                <SortableTableHeader
                  field="user"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  {t('user')}
                </SortableTableHeader>
              )}
              <SortableTableHeader
                field="start_date"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('dateRange')}
              </SortableTableHeader>
              <SortableTableHeader
                field="leave_type"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('leaveType')}
              </SortableTableHeader>
              <SortableTableHeader
                field="created_at"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('created')}
              </SortableTableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unavailableDates.map((unavailableDate) => {
              const badge = getLeaveTypeBadge(
                unavailableDate.leave_type,
                t
              );
              return (
                <TableRow key={unavailableDate.id}>
                  {!isEmployeeUser && (
                    <TableCell className="font-medium">
                      {getUserDisplayName(unavailableDate.user)}
                    </TableCell>
                  )}
                  <TableCell>
                    {formatDateRange(
                      unavailableDate.start_date,
                      unavailableDate.end_date
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.text}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(unavailableDate.created_at).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/unavailable-date/${unavailableDate.id}`
                          )
                        }
                        disabled={isPending}
                        title={t('viewUnavailableDate')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/unavailable-date/${unavailableDate.id}/update`
                          )
                        }
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              isPending ||
                              deletingUnavailableDateId === unavailableDate.id
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t('confirmDelete')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('deleteUnavailableDateConfirmation')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDelete(unavailableDate.id)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                            >
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {unavailableDates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('noUnavailableDatesFound')}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalCount={totalCount}
        limit={limit}
      />
    </div>
  );
}

