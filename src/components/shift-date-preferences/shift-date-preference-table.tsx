'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteShiftDatePreferenceAction } from '@/server-actions/shift-date-preference';
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
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Eye, X, Download } from 'lucide-react';
import { Pagination } from '../layout/pagination';
import {
  SortableTableHeader,
  SortField,
} from '../layout/sortable-table-header';
import { PreferenceType } from '@prisma/client';
import { ShiftDatePreferencesTableProps } from '@/types/shift-date-preference';
import { InfoAlert } from '@/components/info-alert';
import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export const getPreferenceTypeBadge = (
  type: PreferenceType,
  t: (key: string) => string
) => {
  switch (type) {
    case PreferenceType.DESIRED:
      return {
        variant: 'default' as const,
        text: t('desired'),
      };
    case PreferenceType.UNDESIRED:
      return {
        variant: 'destructive' as const,
        text: t('undesired'),
      };
    default:
      return {
        variant: 'secondary' as const,
        text: type,
      };
  }
};

export function ShiftDatePreferencesTable({
  preferences,
  totalCount,
  totalPages,
  currentPage,
  limit,
  sortField,
  sortDirection,
  searchTerm,
  userFilter,
  preferenceTypeFilter,
  isEmployee = false,
  users = [],
}: ShiftDatePreferencesTableProps) {
  // Ensure isEmployee is a boolean
  const isEmployeeUser = Boolean(isEmployee);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('app');

  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [isPending, startTransition] = useTransition();
  const [deletingPreferenceId, setDeletingPreferenceId] = useState<
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

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateUrl({
      search: value,
      page: '1',
    });
  }, 300);

  useEffect(() => {
    debouncedSearch(searchTermLocal);
  }, [searchTermLocal, debouncedSearch]);

  const handleDelete = async (preferenceId: number) => {
    setDeletingPreferenceId(preferenceId);

    startTransition(async () => {
      try {
        await deleteShiftDatePreferenceAction(preferenceId);
        setAlert({
          message: t('preferenceDeletedSuccess'),
          type: 'success',
        });
      } catch (error) {
        setAlert({
          message:
            error instanceof Error ? t(error.message) : t('unexpectedError'),
          type: 'error',
        });
      } finally {
        setDeletingPreferenceId(null);
      }
    });
  };

  const exportFilteredPreferences = useCallback(
    async (format: 'csv' | 'xlsx') => {
      try {
        const params = new URLSearchParams({
          search: searchTermLocal || '',
          userFilter: userFilter !== 'all' ? userFilter : '',
          preferenceTypeFilter:
            preferenceTypeFilter !== 'all' ? preferenceTypeFilter : '',
          sortField: sortField || 'created_at',
          sortDirection: sortDirection || 'desc',
          format,
        });

        const response = await fetch(
          `/api/preferences-export?${params.toString()}`,
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
        link.download = `preferences_export_${new Date()
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
      userFilter,
      preferenceTypeFilter,
      sortField,
      sortDirection,
      t,
    ]
  );

  const handleResetFilters = useCallback(() => {
    setSearchTermLocal('');
    updateUrl({
      search: '',
      userFilter: 'all',
      preferenceTypeFilter: 'all',
      page: '1',
    });
  }, [updateUrl]);

  const hasActiveFilters =
    searchTermLocal !== '' ||
    userFilter !== 'all' ||
    preferenceTypeFilter !== 'all';

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('shiftDatePreferences')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportFilteredPreferences('csv')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .csv
          </Button>
          <Button
            onClick={() => exportFilteredPreferences('xlsx')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .xlsx
          </Button>
          <Button onClick={() => router.push('/shift-date-preference/create')}>
            <Plus className="h-4 w-4" />
            <div className="hidden md:block">{t('create')}</div>
          </Button>
        </div>
      </div>

      {message && <InfoAlert message={t(message) as string} type="success" />}

      {alert && <InfoAlert message={alert.message} type={alert.type} />}

      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder={t('searchPreferences')}
          value={searchTermLocal}
          onChange={(e) => setSearchTermLocal(e.target.value)}
          className="w-full md:max-w-sm"
        />
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
          value={preferenceTypeFilter}
          onValueChange={(value) =>
            updateUrl({ preferenceTypeFilter: value, page: '1' })
          }
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder={t('filterByPreferenceType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allPreferenceTypes')}</SelectItem>
            <SelectItem value={PreferenceType.DESIRED}>
              {t('desired')}
            </SelectItem>
            <SelectItem value={PreferenceType.UNDESIRED}>
              {t('undesired')}
            </SelectItem>
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
                field="date"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('date')}
              </SortableTableHeader>
              <SortableTableHeader
                field="preference_type"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('preferenceType')}
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
            {preferences.map((preference) => {
              const badge = getPreferenceTypeBadge(
                preference.preference_type,
                t
              );
              return (
                <TableRow key={preference.id}>
                  {!isEmployeeUser && (
                    <TableCell className="font-medium">
                      {getUserDisplayName(preference.user)}
                    </TableCell>
                  )}
                  <TableCell>
                    {new Date(preference.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.text}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(preference.created_at).toLocaleDateString(
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
                          router.push(`/shift-date-preference/${preference.id}`)
                        }
                        disabled={isPending}
                        title={t('viewPreference')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/shift-date-preference/${preference.id}/update`
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
                              deletingPreferenceId === preference.id
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
                              {t('deletePreferenceConfirmation')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(preference.id)}
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

        {preferences.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('noPreferencesFound')}
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
