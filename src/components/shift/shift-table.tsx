'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteShiftAction } from '@/server-actions/user-has-shift';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Pencil, Trash2, Plus, Eye, X, Download } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { Pagination } from '../layout/pagination';
import {
  SortableTableHeader,
  SortField,
} from '../layout/sortable-table-header';
import { UserHasShiftsTableProps } from '@/types/user-has-shift';
import { InfoAlert } from '@/components/info-alert';
import { Role } from '@prisma/client';

export function ShiftsTable({
  shifts,
  totalCount,
  totalPages,
  currentPage,
  limit,
  sortField,
  sortDirection,
  searchTerm,
  userFilter,
  shiftTypeFilter,
  statusFilter,
  userRole,
  userCompanyId,
}: UserHasShiftsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('app');

  // Local state for immediate UI feedback
  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [userFilterLocal, setUserFilterLocal] = useState(userFilter);
  const [shiftTypeFilterLocal, setShiftTypeFilterLocal] =
    useState(shiftTypeFilter);
  const [statusFilterLocal, setStatusFilterLocal] = useState(statusFilter);
  const [isPending, startTransition] = useTransition();
  const [deletingShiftId, setDeletingShiftId] = useState<number | null>(null);
  const [alert, setAlert] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  // Show success message if present in URL
  const message = searchParams.get('message');

  // Function to update URL with new params
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

  // Handle sorting
  const handleSort = useCallback(
    (field: SortField) => {
      const newDirection =
        sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';

      updateUrl({
        sortField: field,
        sortDirection: newDirection,
        page: '1', // Reset to first page when sorting
      });
    },
    [sortField, sortDirection, updateUrl]
  );

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      updateUrl({ page: page.toString() });
    },
    [updateUrl]
  );

  // Debounced search handler
  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateUrl({
      search: value,
      page: '1', // Reset to first page when searching
    });
  }, 300);

  // Handle search input changes
  useEffect(() => {
    debouncedSearch(searchTermLocal);
  }, [searchTermLocal, debouncedSearch]);

  // Handle user filter changes
  const handleUserFilterChange = useCallback(
    (value: string) => {
      setUserFilterLocal(value);
      updateUrl({
        userFilter: value,
        page: '1',
      });
    },
    [updateUrl]
  );

  // Handle shift type filter changes
  const handleShiftTypeFilterChange = useCallback(
    (value: string) => {
      setShiftTypeFilterLocal(value);
      updateUrl({
        shiftTypeFilter: value,
        page: '1',
      });
    },
    [updateUrl]
  );

  // Handle status filter changes
  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setStatusFilterLocal(value);
      updateUrl({
        statusFilter: value,
        page: '1',
      });
    },
    [updateUrl]
  );

  // Handle shift deletion
  const handleDelete = async (shiftId: number) => {
    setDeletingShiftId(shiftId);

    startTransition(async () => {
      try {
        await deleteShiftAction(shiftId);
        setAlert({
          message: t('shiftDeletedSuccess'),
          type: 'success',
        });
      } catch (error) {
        setAlert({
          message:
            error instanceof Error ? t(error.message) : t('unexpectedError'),
          type: 'error',
        });
      } finally {
        setDeletingShiftId(null);
      }
    });
  };

  const exportFilteredShifts = useCallback(
    async (format: 'csv' | 'xlsx') => {
      try {
        const params = new URLSearchParams({
          search: searchTermLocal || '',
          userFilter: userFilterLocal || 'all',
          shiftTypeFilter: shiftTypeFilterLocal || 'all',
          statusFilter: statusFilterLocal || 'all',
          sortField: sortField || 'created_at',
          sortDirection: sortDirection || 'desc',
          format,
        });

        const response = await fetch(
          `/api/shifts-export?${params.toString()}`,
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
        link.download = `shifts_export_${new Date()
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
      searchTermLocal,
      userFilterLocal,
      shiftTypeFilterLocal,
      statusFilterLocal,
      sortField,
      sortDirection,
      t,
    ]
  );

  const handleResetFilters = useCallback(() => {
    setSearchTermLocal('');
    setUserFilterLocal('all');
    setShiftTypeFilterLocal('all');
    setStatusFilterLocal('all');
    updateUrl({
      search: '',
      userFilter: '',
      shiftTypeFilter: '',
      statusFilter: '',
      page: '1',
    });
  }, [updateUrl]);

  const hasActiveFilters =
    searchTermLocal !== '' ||
    userFilterLocal !== 'all' ||
    shiftTypeFilterLocal !== 'all' ||
    statusFilterLocal !== 'all';

  // Get unique users and shift types from shifts for filters
  const users = Array.from(
    new Map(shifts.map((shift) => [shift.user!.id, shift.user!])).values()
  );

  const shiftTypes = Array.from(
    new Map(
      shifts.map((shift) => [shift.shift_type!.id, shift.shift_type!])
    ).values()
  );

  // Format date helper
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Get user display name helper
  const getUserDisplayName = (user: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  }) => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.email;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('shifts')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportFilteredShifts('csv')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .csv
          </Button>
          <Button
            onClick={() => exportFilteredShifts('xlsx')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .xlsx
          </Button>
          <Button onClick={() => router.push('/shift/create')}>
            <Plus className="h-4 w-4" />
            <div className="hidden md:block">{t('create')}</div>
          </Button>
        </div>
      </div>

      {/* Success message */}
      {message && <InfoAlert message={t(message) as string} type="success" />}

      {alert && <InfoAlert message={alert.message} type={alert.type} />}

      {/* Search controls */}
      <div className="flex flex-col gap-4">
        <Input
          placeholder={t('searchShifts')}
          value={searchTermLocal}
          onChange={(e) => setSearchTermLocal(e.target.value)}
          className="w-full"
        />
        <div className="flex flex-col md:flex-row gap-4">
          <Select
            value={userFilterLocal}
            onValueChange={handleUserFilterChange}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t('allUsers')} />
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
          <Select
            value={shiftTypeFilterLocal}
            onValueChange={handleShiftTypeFilterChange}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t('allShiftTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allShiftTypes')}</SelectItem>
              {shiftTypes.map((st) => (
                <SelectItem key={st.id} value={st.id.toString()}>
                  {st.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilterLocal}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t('allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="SCHEDULED">{t('scheduledStatus')}</SelectItem>
              <SelectItem value="CONFIRMED">{t('confirmedStatus')}</SelectItem>
              <SelectItem value="COMPLETED">{t('completedStatus')}</SelectItem>
              <SelectItem value="CANCELLED">{t('cancelledStatus')}</SelectItem>
              <SelectItem value="NO_SHOW">{t('noShowStatus')}</SelectItem>
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
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHeader
                field="user_name"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('user')}
              </SortableTableHeader>
              <SortableTableHeader
                field="shift_type_name"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('shiftType')}
              </SortableTableHeader>
              <SortableTableHeader
                field="date"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('date')}
              </SortableTableHeader>
              <SortableTableHeader
                field="status"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('status')}
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
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell className="font-medium">
                  {getUserDisplayName(shift.user!)}
                </TableCell>
                <TableCell>{shift.shift_type!.name}</TableCell>
                <TableCell>{formatDate(shift.date)}</TableCell>
                <TableCell>{t(shift.status.toLowerCase())}</TableCell>
                <TableCell>{formatDate(shift.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/shift/${shift.id}`)}
                      disabled={isPending}
                      title={t('viewShift')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/shift/${shift.id}/update`)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending || deletingShiftId === shift.id}
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
                            {t('deleteShiftConfirmation', {
                              user: getUserDisplayName(shift.user!),
                              date: formatDate(shift.date),
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(shift.id)}
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
            ))}
          </TableBody>
        </Table>

        {shifts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('noShiftsFound')}
          </div>
        )}
      </div>

      {/* Pagination */}
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
