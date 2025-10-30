'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteShiftTypeAction } from '@/server-actions/shift-type';
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
import { ShiftTypesTableProps } from '@/types/shift-type';
import { InfoAlert } from '@/components/info-alert';
import { Role } from '@prisma/client';

export function ShiftTypesTable({
  shiftTypes,
  totalCount,
  totalPages,
  currentPage,
  limit,
  sortField,
  sortDirection,
  searchTerm,
  companyFilter,
  userRole,
  userCompanyId,
}: ShiftTypesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('app');

  // Local state for immediate UI feedback
  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [companyFilterLocal, setCompanyFilterLocal] = useState(companyFilter);
  const [isPending, startTransition] = useTransition();
  const [deletingShiftTypeId, setDeletingShiftTypeId] = useState<number | null>(
    null
  );
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
        page: '1',
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
      page: '1',
    });
  }, 300);

  // Handle search input changes
  useEffect(() => {
    debouncedSearch(searchTermLocal);
  }, [searchTermLocal, debouncedSearch]);

  // Handle company filter changes
  const handleCompanyFilterChange = useCallback(
    (value: string) => {
      setCompanyFilterLocal(value);
      updateUrl({
        companyFilter: value,
        page: '1',
      });
    },
    [updateUrl]
  );

  // Handle shift type deletion
  const handleDelete = async (shiftTypeId: number) => {
    setDeletingShiftTypeId(shiftTypeId);

    startTransition(async () => {
      try {
        await deleteShiftTypeAction(shiftTypeId);
        setAlert({
          message: t('shiftTypeDeletedSuccess'),
          type: 'success',
        });
      } catch (error) {
        setAlert({
          message:
            error instanceof Error ? t(error.message) : t('unexpectedError'),
          type: 'error',
        });
      } finally {
        setDeletingShiftTypeId(null);
      }
    });
  };

  const exportFilteredShiftTypes = useCallback(
    async (format: 'csv' | 'xlsx') => {
      try {
        const params = new URLSearchParams({
          search: searchTermLocal || '',
          companyFilter: companyFilterLocal || 'all',
          sortField: sortField || 'created_at',
          sortDirection: sortDirection || 'desc',
          format,
        });

        const response = await fetch(
          `/api/shift-types-export?${params.toString()}`,
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
        link.download = `shift_types_export_${new Date()
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
    [searchTermLocal, companyFilterLocal, sortField, sortDirection, t]
  );

  const handleResetFilters = useCallback(() => {
    setSearchTermLocal('');
    setCompanyFilterLocal('all');
    updateUrl({
      search: '',
      companyFilter: '',
      page: '1',
    });
  }, [updateUrl]);

  const hasActiveFilters =
    searchTermLocal !== '' || companyFilterLocal !== 'all';

  // Get unique companies from shift types for filter
  const companies = Array.from(
    new Map(shiftTypes.map((st) => [st.company!.id, st.company!])).values()
  );

  // Format time helper
  const formatTime = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('shiftTypes')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportFilteredShiftTypes('csv')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .csv
          </Button>
          <Button
            onClick={() => exportFilteredShiftTypes('xlsx')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .xlsx
          </Button>
          <Button onClick={() => router.push('/shift-type/create')}>
            <Plus className="h-4 w-4" />
            <div className="hidden md:block">{t('create')}</div>
          </Button>
        </div>
      </div>

      {/* Success message */}
      {message && <InfoAlert message={t(message) as string} type="success" />}

      {alert && <InfoAlert message={alert.message} type={alert.type} />}

      {/* Search controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder={t('searchShiftTypes')}
          value={searchTermLocal}
          onChange={(e) => setSearchTermLocal(e.target.value)}
          className="w-full md:max-w-sm"
        />
        {userRole === Role.ADMIN && (
          <Select
            value={companyFilterLocal}
            onValueChange={handleCompanyFilterChange}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t('allCompanies')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCompanies')}</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHeader
                field="name"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('name')}
              </SortableTableHeader>
              {userRole === Role.ADMIN && (
                <SortableTableHeader
                  field="company"
                  currentField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                >
                  {t('company')}
                </SortableTableHeader>
              )}
              <TableHead>{t('startTime')}</TableHead>
              <TableHead>{t('endTime')}</TableHead>
              <SortableTableHeader
                field="shifts_count"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('shifts')}
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
            {shiftTypes.map((shiftType) => (
              <TableRow key={shiftType.id}>
                <TableCell className="font-medium">{shiftType.name}</TableCell>
                {userRole === Role.ADMIN && (
                  <TableCell>{shiftType.company?.name}</TableCell>
                )}
                <TableCell>{formatTime(shiftType.start_time)}</TableCell>
                <TableCell>{formatTime(shiftType.end_time)}</TableCell>
                <TableCell>{shiftType._count?.shifts || 0}</TableCell>
                <TableCell>
                  {new Date(shiftType.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/shift-type/${shiftType.id}`)}
                      disabled={isPending}
                      title={t('viewShiftType')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/shift-type/${shiftType.id}/update`)
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
                            deletingShiftTypeId === shiftType.id ||
                            (shiftType._count?.shifts || 0) > 0
                          }
                          title={
                            (shiftType._count?.shifts || 0) > 0
                              ? t('cannotDeleteShiftTypeWithShifts')
                              : ''
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
                            {t('deleteShiftTypeConfirmation', {
                              name: shiftType.name,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(shiftType.id)}
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

        {shiftTypes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('noShiftTypesFound')}
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
