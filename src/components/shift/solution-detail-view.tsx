'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  deleteSolutionAction,
  checkSolutionValidityAction,
  buildWarmStartPayloadAction,
} from '@/server-actions/solution';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ArrowLeft, Trash2, RefreshCw, Calendar } from 'lucide-react';
import Link from 'next/link';

interface SolutionData {
  solution: {
    id: number;
    timefoldJobId: string;
    startDate: Date;
    endDate: Date;
    hardScore: number;
    softScore: number;
    isFeasible: boolean;
    solverStatus: string;
    version: number;
    metadata: any;
    createdAt: Date;
    createdBy: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    parentSolutionId: number | null;
  };
  assignments: Array<{
    id: number;
    employeeName: string;
    employeeId: number;
    shiftDate: Date;
    shiftStartTime: string;
    shiftEndTime: string;
    requiredSkill: string;
    location: string;
    isModified: boolean;
    userHasShiftId: number;
    timefoldShiftId: string;
  }>;
  childSolutions: Array<{
    id: number;
    version: number;
    createdAt: Date;
  }>;
}

interface SolutionDetailViewProps {
  solutionData: SolutionData;
}

export function SolutionDetailView({ solutionData }: SolutionDetailViewProps) {
  const router = useRouter();
  const t = useTranslations('app');
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [reOptimizing, setReOptimizing] = useState(false);

  const { solution, assignments, childSolutions } = solutionData;

  // Handle re-optimization
  const handleReOptimize = async () => {
    setReOptimizing(true);

    try {
      // Step 1: Validate solution
      const validation = await checkSolutionValidityAction(solution.id);

      // Show warnings if any
      if (validation.warnings.length > 0) {
        const warningMessage =
          'Warnings:\n' + validation.warnings.join('\n') + '\n\nContinue anyway?';
        if (!confirm(warningMessage)) {
          setReOptimizing(false);
          return;
        }
      }

      // Show errors and block if validation failed
      if (!validation.canProceed) {
        alert('Cannot re-optimize:\n\n' + validation.errors.join('\n'));
        setReOptimizing(false);
        return;
      }

      // Step 2: Build warm-start payload
      const payload = await buildWarmStartPayloadAction(solution.id);

      // Step 3: Store payload in sessionStorage and navigate
      sessionStorage.setItem('warmStartPayload', JSON.stringify(payload));
      router.push('/shift/auto-assign?warmStart=true');
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to prepare re-optimization'
      );
      setReOptimizing(false);
    }
  };

  // Handle solution deletion
  const handleDelete = async () => {
    setDeleting(true);

    try {
      const result = await deleteSolutionAction(solution.id);

      if (result.success) {
        router.push('/shift/solutions?message=solutionDeleted');
      } else {
        alert(result.error || 'Failed to delete solution');
        setDeleting(false);
      }
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to delete solution'
      );
      setDeleting(false);
    }
  };

  // Format creator name
  const formatCreatorName = () => {
    if (solution.createdBy.firstName && solution.createdBy.lastName) {
      return `${solution.createdBy.firstName} ${solution.createdBy.lastName}`;
    }
    return solution.createdBy.email;
  };

  // Format date range
  const formatDateRange = () => {
    const startStr = new Date(solution.startDate).toLocaleDateString();
    const endStr = new Date(solution.endDate).toLocaleDateString();
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/shift/solutions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToSolutions')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {t('solutionDetails')} #{solution.id}
            </h1>
            <p className="text-muted-foreground mt-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              {formatDateRange()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Re-optimize button */}
          <Button
            variant="outline"
            onClick={handleReOptimize}
            disabled={reOptimizing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${reOptimizing ? 'animate-spin' : ''}`} />
            {reOptimizing ? t('preparing') : t('reOptimize')}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteSolution')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteSolutionWarning', {
                    count: assignments.length,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {t('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('scores')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('hardScore')}:
                </span>
                <Badge
                  variant={solution.hardScore === 0 ? 'default' : 'destructive'}
                >
                  {solution.hardScore}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('softScore')}:
                </span>
                <span className="font-medium">
                  {solution.softScore.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('status')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('feasibility')}:
                </span>
                <Badge
                  variant={solution.isFeasible ? 'default' : 'destructive'}
                >
                  {solution.isFeasible ? t('feasible') : t('infeasible')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('version')}:
                </span>
                <Badge variant="outline">v{solution.version}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('metadata')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {t('jobId')}:
                </span>
                <span className="text-xs font-mono truncate">
                  {solution.timefoldJobId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('shifts')}:
                </span>
                <span className="font-medium">{assignments.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('creator')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {t('createdBy')}:
                </span>
                <span className="text-sm font-medium">
                  {formatCreatorName()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {t('createdAt')}:
                </span>
                <span className="text-sm">
                  {new Date(solution.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Versioning info */}
      {(solution.parentSolutionId || childSolutions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('versionHistory')}</CardTitle>
            <CardDescription>
              {t('versionHistoryDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {solution.parentSolutionId && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('parent')}: </span>
                  <Link
                    href={`/shift/solutions/${solution.parentSolutionId}`}
                    className="text-primary hover:underline"
                  >
                    Solution #{solution.parentSolutionId}
                  </Link>
                </div>
              )}
              {childSolutions.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {t('childSolutions')}:{' '}
                  </span>
                  {childSolutions.map((child, index) => (
                    <span key={child.id}>
                      <Link
                        href={`/shift/solutions/${child.id}`}
                        className="text-primary hover:underline"
                      >
                        v{child.version}
                      </Link>
                      {index < childSolutions.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('assignments')}</CardTitle>
          <CardDescription>
            {t('assignmentsDescription', { count: assignments.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('employee')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('time')}</TableHead>
                  <TableHead>{t('skill')}</TableHead>
                  <TableHead>{t('location')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {t('noAssignments')}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments
                    .sort((a, b) => {
                      const dateA = new Date(a.shiftDate).getTime();
                      const dateB = new Date(b.shiftDate).getTime();
                      return dateA - dateB;
                    })
                    .map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.employeeName}
                        </TableCell>
                        <TableCell>
                          {new Date(assignment.shiftDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {assignment.shiftStartTime} - {assignment.shiftEndTime}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {assignment.requiredSkill}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {assignment.location}
                          </span>
                        </TableCell>
                        <TableCell>
                          {assignment.isModified && (
                            <Badge variant="secondary">{t('modified')}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
