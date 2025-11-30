'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteSolutionAction } from '@/server-actions/solution';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Eye, Trash2, Plus, Calendar } from 'lucide-react';
import { Pagination } from '../layout/pagination';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

interface Solution {
  id: number;
  startDate: Date;
  endDate: Date;
  hardScore: number;
  softScore: number;
  isFeasible: boolean;
  version: number;
  createdAt: Date;
  createdBy: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  assignmentCount: number;
  parentSolutionId: number | null;
}

interface SolutionsTableProps {
  solutions: Solution[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  sortBy: 'created_at' | 'hard_score' | 'soft_score';
  sortDirection: 'asc' | 'desc';
  feasibleOnly: boolean;
}

export function SolutionsTable({
  solutions,
  totalCount,
  totalPages,
  currentPage,
  limit,
  sortBy,
  sortDirection,
  feasibleOnly,
}: SolutionsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('app');

  const [isPending, startTransition] = useTransition();
  const [deletingSolutionId, setDeletingSolutionId] = useState<number | null>(
    null
  );

  // Function to update URL with new params
  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const current = new URLSearchParams(searchParams);
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== '') {
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
    (field: 'created_at' | 'hard_score' | 'soft_score') => {
      startTransition(() => {
        const newDirection =
          sortBy === field && sortDirection === 'desc' ? 'asc' : 'desc';
        updateUrl({
          sortBy: field,
          sortDirection: newDirection,
          page: '1',
        });
      });
    },
    [sortBy, sortDirection, updateUrl]
  );

  // Handle feasible filter toggle
  const handleFeasibleFilterToggle = useCallback(
    (checked: boolean) => {
      startTransition(() => {
        updateUrl({
          feasibleOnly: checked ? 'true' : '',
          page: '1',
        });
      });
    },
    [updateUrl]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      startTransition(() => {
        updateUrl({ page: page.toString() });
      });
    },
    [updateUrl]
  );

  // Handle solution deletion
  const handleDelete = async (solutionId: number, assignmentCount: number) => {
    setDeletingSolutionId(solutionId);

    try {
      const result = await deleteSolutionAction(solutionId);

      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Failed to delete solution');
      }
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to delete solution'
      );
    } finally {
      setDeletingSolutionId(null);
    }
  };

  // Format date range
  const formatDateRange = (start: Date, end: Date) => {
    const startStr = new Date(start).toLocaleDateString();
    const endStr = new Date(end).toLocaleDateString();
    return `${startStr} - ${endStr}`;
  };

  // Format creator name
  const formatCreatorName = (creator: Solution['createdBy']) => {
    if (creator.firstName && creator.lastName) {
      return `${creator.firstName} ${creator.lastName}`;
    }
    return creator.email;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('solutions')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('solutionsDescription')}
          </p>
        </div>
        <Link href="/shift/auto-assign">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t('newAutoAssign')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="feasibleOnly"
            checked={feasibleOnly}
            onCheckedChange={handleFeasibleFilterToggle}
          />
          <label
            htmlFor="feasibleOnly"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {t('showOnlyFeasible')}
          </label>
        </div>

        <div className="text-sm text-muted-foreground">
          {totalCount} {t('totalSolutions')}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('created_at')}
                  className="hover:bg-transparent p-0 h-auto font-semibold"
                >
                  {t('dateRange')}
                  {sortBy === 'created_at' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Button>
              </TableHead>
              <TableHead>{t('version')}</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('hard_score')}
                  className="hover:bg-transparent p-0 h-auto font-semibold"
                >
                  {t('hardScore')}
                  {sortBy === 'hard_score' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('soft_score')}
                  className="hover:bg-transparent p-0 h-auto font-semibold"
                >
                  {t('softScore')}
                  {sortBy === 'soft_score' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Button>
              </TableHead>
              <TableHead>{t('feasibility')}</TableHead>
              <TableHead>{t('shifts')}</TableHead>
              <TableHead>{t('createdBy')}</TableHead>
              <TableHead>{t('createdAt')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solutions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <p className="text-muted-foreground">{t('noSolutions')}</p>
                  <Link href="/shift/auto-assign">
                    <Button variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('createFirstSolution')}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              solutions.map((solution) => (
                <TableRow key={solution.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {formatDateRange(solution.startDate, solution.endDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{solution.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={solution.hardScore === 0 ? 'default' : 'destructive'}
                    >
                      {solution.hardScore}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {solution.softScore.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={solution.isFeasible ? 'default' : 'destructive'}
                    >
                      {solution.isFeasible ? t('feasible') : t('infeasible')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{solution.assignmentCount}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatCreatorName(solution.createdBy)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(solution.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/shift/solutions/${solution.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingSolutionId === solution.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t('deleteSolution')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('deleteSolutionWarning', {
                                count: solution.assignmentCount,
                              })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDelete(
                                  solution.id,
                                  solution.assignmentCount
                                )
                              }
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <Pagination
          totalCount={totalCount}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          limit={limit}
          isPending={isPending}
        />
      )}
    </div>
  );
}
