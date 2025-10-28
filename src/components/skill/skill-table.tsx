'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteSkillAction } from '@/server-actions/skill';
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
import { SkillsTableProps } from '@/types/skill';
import { InfoAlert } from '@/components/info-alert';
import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export function SkillsTable({
  skills,
  totalCount,
  totalPages,
  currentPage,
  limit,
  sortField,
  sortDirection,
  searchTerm,
}: SkillsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('app');

  // Local state for immediate UI feedback
  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [isPending, startTransition] = useTransition();
  const [deletingSkillId, setDeletingSkillId] = useState<number | null>(null);
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

  // Handle skill deletion
  const handleDelete = async (skillId: number) => {
    setDeletingSkillId(skillId);

    startTransition(async () => {
      try {
        await deleteSkillAction(skillId);
        setAlert({
          message: t('skillDeletedSuccess'),
          type: 'success',
        });
      } catch (error) {
        setAlert({
          message:
            error instanceof Error ? t(error.message) : t('unexpectedError'),
          type: 'error',
        });
      } finally {
        setDeletingSkillId(null);
      }
    });
  };

  const handleResetFilters = useCallback(() => {
    setSearchTermLocal('');
    updateUrl({
      search: '',
      page: '1',
    });
  }, [updateUrl]);

  const hasActiveFilters = searchTermLocal !== '';

  const exportFilteredSkills = useCallback(
    async (format: 'csv' | 'xlsx') => {
      try {
        const params = new URLSearchParams({
          search: searchTermLocal || '',
          sortField: sortField || 'created_at',
          sortDirection: sortDirection || 'desc',
          format,
        });

        const response = await fetch(
          `/api/skills-export?${params.toString()}`,
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
        link.download = `skills_export_${new Date()
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
    [searchTermLocal, sortField, sortDirection, t]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('skills')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportFilteredSkills('csv')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .csv
          </Button>
          <Button
            onClick={() => exportFilteredSkills('xlsx')}
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            .xlsx
          </Button>
          <Button onClick={() => router.push('/skill/create')}>
            <Plus className="h-4 w-4" />
            <div className="hidden md:block">{t('create')}</div>
          </Button>
        </div>
      </div>

      {/* Success message */}
      {message && <InfoAlert message={t(message) as string} type="success" />}

      {alert && <InfoAlert message={alert.message} type={alert.type} />}

      {/* Search and filter controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder={t('searchSkills')}
          value={searchTermLocal}
          onChange={(e) => setSearchTermLocal(e.target.value)}
          className="w-full md:max-w-sm"
        />
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
              <SortableTableHeader
                field="users_count"
                currentField={sortField}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t('usersCount')}
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
            {skills.map((skill) => (
              <TableRow key={skill.id}>
                <TableCell className="font-medium">{skill.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{skill._count.users}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(skill.created_at).toLocaleDateString('en-US', {
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
                      onClick={() => router.push(`/skill/${skill.id}`)}
                      disabled={isPending}
                      title={t('viewSkill')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/skill/${skill.id}/update`)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending || deletingSkillId === skill.id}
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
                            {t('deleteSkillConfirmation', {
                              name: skill.name,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(skill.id)}
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

        {skills.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('noSkillsFound')}
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
