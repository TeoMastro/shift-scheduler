'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { InfoAlert } from '@/components/info-alert';
import {
  submitAutoAssignAction,
  storeAutoAssignmentsAction,
  checkExistingShiftsInDateRange,
} from '@/server-actions/user-has-shift';
import {
  parseSolution,
  ShiftAssignment,
  ParsedScore,
  ConstraintViolation,
} from '@/lib/solution-parser';
import { ShiftPreviewCalendar } from './shift-preview-calendar';

interface AutoAssignFormProps {
  companyId: number | null;
}

type SolutionStatus = 'idle' | 'solving' | 'solved' | 'failed' | 'infeasible';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 60_000; // 60 seconds

export function AutoAssignForm({ companyId }: AutoAssignFormProps) {
  const router = useRouter();
  const t = useTranslations('app');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [solutionStatus, setSolutionStatus] = useState<SolutionStatus>('idle');
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [score, setScore] = useState<ParsedScore | null>(null);
  const [solverStatus, setSolverStatus] = useState<string>('');
  const [isFeasible, setIsFeasible] = useState<boolean>(false);
  const [constraintViolations, setConstraintViolations] = useState<
    ConstraintViolation[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Warm-start mode
  const [isWarmStart, setIsWarmStart] = useState(false);
  const [parentSolutionId, setParentSolutionId] = useState<number | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number | null>(null);

  // Check for warm-start mode on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('warmStart') === 'true') {
      const payloadStr = sessionStorage.getItem('warmStartPayload');
      if (payloadStr) {
        try {
          const payload = JSON.parse(payloadStr);
          setIsWarmStart(true);
          setParentSolutionId(payload.metadata.parentSolutionId);
          setStartDate(payload.metadata.startDate);
          setEndDate(payload.metadata.endDate);
          sessionStorage.removeItem('warmStartPayload'); // Clean up
        } catch (e) {
          console.error('Failed to parse warm-start payload:', e);
        }
      }
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollStartTimeRef.current = null;
  };

  const pollSolutionStatus = async (currentJobId: string) => {
    try {
      const res = await fetch(`/api/solve/status/${currentJobId}`);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch solution status');
      }

      const data = await res.json();

      // Check for timeout
      if (
        pollStartTimeRef.current &&
        Date.now() - pollStartTimeRef.current > MAX_POLL_DURATION_MS
      ) {
        stopPolling();
        setSolutionStatus('failed');
        setError(
          'Solution polling timed out. Best-so-far solution is displayed.'
        );
        return;
      }

      // Parse the solution
      const parsed = parseSolution({
        jobId: currentJobId,
        solution: data.solution,
      });

      // Update state
      setAssignments(parsed.assignments);
      setScore(parsed.score);
      setSolverStatus(parsed.solverStatus);
      setIsFeasible(parsed.isFeasible);

      // Set constraint violations from API response (from analyze endpoint)
      if (
        data.constraintViolations &&
        Array.isArray(data.constraintViolations)
      ) {
        setConstraintViolations(data.constraintViolations);
      } else {
        setConstraintViolations([]);
      }

      // Determine status
      if (parsed.solverStatus === 'NOT_SOLVING') {
        stopPolling();
        if (parsed.isFeasible) {
          setSolutionStatus('solved');
        } else {
          setSolutionStatus('infeasible');
          setError(
            t('problemInfeasible', {
              hard: parsed.score?.hard ?? 0,
            })
          );
        }
      } else if (
        parsed.solverStatus === 'SOLVING' ||
        parsed.solverStatus === 'SOLVING_SCHEDULED'
      ) {
        setSolutionStatus('solving');
      } else {
        // Unknown status, continue polling
        setSolutionStatus('solving');
      }

      // Handle parsing errors
      if (parsed.error) {
        console.error('Parsing error:', parsed.error);
      }
    } catch (err) {
      stopPolling();
      setSolutionStatus('failed');
      setError(err instanceof Error ? err.message : t('unexpectedError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSolutionStatus('idle');
    setAssignments([]);
    setScore(null);
    setJobId(null);
    setSolverStatus('');
    setConstraintViolations([]);

    if (!startDate || !endDate) {
      setError(t('dateRangeRequired'));
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setError(t('startDateAfterEndDate'));
      return;
    }

    setLoading(true);

    try {
      // For warm-start, conflicts already checked in validation
      if (!isWarmStart) {
        const existingShiftsCheck = await checkExistingShiftsInDateRange(
          startDate,
          endDate,
          companyId!
        );

        if (existingShiftsCheck.hasShifts) {
          setError(
            t('shiftsAlreadyExistInDateRange', {
              count: existingShiftsCheck.count || 0,
            })
          );
          setLoading(false);
          return;
        }
      }

      const payload = await submitAutoAssignAction({
        start_date: startDate,
        end_date: endDate,
        company_id: companyId!,
      });

      // Start solving job
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to start auto-assignment');
      }

      const result = await res.json();
      const newJobId = result.jobId;

      if (!newJobId) {
        throw new Error('No job ID returned from server');
      }

      setJobId(newJobId);
      setSolutionStatus('solving');

      // Start polling
      pollStartTimeRef.current = Date.now();
      pollingIntervalRef.current = setInterval(() => {
        pollSolutionStatus(newJobId);
      }, POLL_INTERVAL_MS);

      // Do initial poll immediately
      pollSolutionStatus(newJobId);
    } catch (err) {
      stopPolling();
      setSolutionStatus('failed');
      setError(err instanceof Error ? err.message : t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAssignments = async () => {
    if (!companyId || assignments.length === 0) {
      setError('Cannot save: Invalid company or no assignments');
      return;
    }

    if (!jobId || !startDate || !endDate || !score) {
      setError('Missing solution metadata');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await storeAutoAssignmentsAction(
        assignments,
        companyId,
        {
          jobId,
          startDate,
          endDate,
          hardScore: score.hard,
          softScore: score.soft,
          isFeasible,
          solverStatus,
          constraintViolations,
          parentSolutionId,
        }
      );

      if (result.success) {
        setError(null);
        setSaveSuccess(true);
        router.push(
          `/shift?message=${encodeURIComponent('assignmentsSavedSuccess')}`
        );
      } else {
        setSaveSuccess(false);
        // Handle errors
        let errorMessage = result.error || t('assignmentsSaveError');

        if (result.failedAssignments && result.failedAssignments.length > 0) {
          errorMessage += '\n\nFailed assignments:';
          result.failedAssignments.forEach((fa) => {
            errorMessage += `\n- ${fa.employeeName} (${fa.date}): ${fa.reason}`;
          });
        }

        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('assignmentsSaveError'));
    } finally {
      setSaving(false);
    }
  };

  // Get status badge color and message
  const getStatusDisplay = () => {
    switch (solutionStatus) {
      case 'solving':
        return {
          variant: 'default' as const,
          message: t('assignmentInProgress'),
          type: 'warning' as const,
        };
      case 'solved':
        return {
          variant: 'default' as const,
          message: t('assignmentSolved'),
          type: 'success' as const,
        };
      case 'infeasible':
        return {
          variant: 'destructive' as const,
          message: t('solutionInfeasible'),
          type: 'error' as const,
        };
      case 'failed':
        return {
          variant: 'destructive' as const,
          message: t('assignmentFailed'),
          type: 'error' as const,
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(isWarmStart ? '/shift/solutions' : '/shift')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isWarmStart ? t('reOptimizeSchedule') : t('autoAssign')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isWarmStart
              ? t('reOptimizeDescription')
              : t('autoAssignDescription')}
          </p>
        </div>
      </div>

      {/* Warm-start indicator */}
      {isWarmStart && parentSolutionId && (
        <InfoAlert
          message={t('warmStartMode', { solutionId: parentSolutionId })}
          type="info"
        />
      )}

      {/* Error message */}
      {error && <InfoAlert message={error} type="error" />}

      {/* Status message */}
      {statusDisplay && (
        <InfoAlert message={statusDisplay.message} type={statusDisplay.type} />
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('selectDateRange')}</CardTitle>
          <CardDescription>{t('selectDateRangeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">{t('startDate')}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={loading || solutionStatus === 'solving' || isWarmStart}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">{t('endDate')}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  disabled={loading || solutionStatus === 'solving' || isWarmStart}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading || solutionStatus === 'solving'}
              >
                {loading || solutionStatus === 'solving'
                  ? t('generating')
                  : t('generatePayload')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/shift')}
                disabled={loading || solutionStatus === 'solving'}
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Solution Status and Score */}
      {(solutionStatus !== 'idle' || score) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('solutionStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('status')}:</span>
                <Badge
                  variant={
                    solutionStatus === 'solved'
                      ? 'default'
                      : solutionStatus === 'infeasible' ||
                          solutionStatus === 'failed'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {solverStatus || solutionStatus}
                </Badge>
              </div>
              {score && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t('hardScore')}:
                    </span>{' '}
                    <span
                      className={
                        score.hard > 0 ? 'font-semibold text-destructive' : ''
                      }
                    >
                      {score.hard}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t('softScore')}:
                    </span>{' '}
                    <span className="font-medium">{score.soft.toFixed(2)}</span>
                  </div>
                  <div>
                    <Badge
                      variant={score.hard === 0 ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {score.hard === 0
                        ? t('solutionFeasible')
                        : t('solutionInfeasible')}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Constraint Violations */}
            {constraintViolations.length > 0 && (
              <div className="mt-4 space-y-4 p-4 border rounded-lg bg-destructive/5">
                <div className="text-sm font-medium text-destructive">
                  {t('constraintViolations')}:
                </div>
                <div className="space-y-3">
                  {constraintViolations.map((constraint, idx) => (
                    <div
                      key={idx}
                      className="text-sm border-l-2 pl-3"
                      style={{
                        borderColor:
                          constraint.type === 'hard'
                            ? 'rgb(239 68 68)'
                            : 'rgb(234 179 8)',
                      }}
                    >
                      <div className="font-medium">
                        {constraint.name} ({constraint.type})
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        Penalty: {constraint.score} | Weight:{' '}
                        {constraint.weight}
                      </div>
                      {constraint.violations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">
                            Violations ({constraint.violations.length}):
                          </div>
                          {constraint.violations.map((violation, vIdx) => (
                            <div
                              key={vIdx}
                              className="text-xs text-muted-foreground pl-2"
                            >
                              • Score: {violation.score}
                              {violation.justification &&
                                typeof violation.justification === 'object' && (
                                  <div className="pl-2 mt-1 opacity-75">
                                    {JSON.stringify(
                                      violation.justification,
                                      null,
                                      2
                                    )}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accept Button - Show when solution is solved or infeasible */}
            {(solutionStatus === 'solved' || solutionStatus === 'infeasible') &&
              assignments.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  {solutionStatus === 'infeasible' && (
                    <div className="mb-4">
                      <InfoAlert
                        message={t('infeasibleWarning')}
                        type="warning"
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleAcceptAssignments}
                    disabled={saving || !companyId}
                    className="w-full sm:w-auto"
                  >
                    {saving ? t('savingAssignments') : t('acceptAssignments')}
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Preview Calendar */}
      {(assignments.length > 0 || solutionStatus === 'solving') && (
        <ShiftPreviewCalendar
          assignments={assignments}
          isLoading={solutionStatus === 'solving'}
        />
      )}
    </div>
  );
}
