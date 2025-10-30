'use client';

import { useState } from 'react';
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
import { ArrowLeft } from 'lucide-react';
import { InfoAlert } from '@/components/info-alert';
import { submitAutoAssignAction } from '@/server-actions/user-has-shift';

interface AutoAssignFormProps {
  companyId: number | null;
}

export function AutoAssignForm({ companyId }: AutoAssignFormProps) {
  const router = useRouter();
  const t = useTranslations('app');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

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
      const payload = await submitAutoAssignAction({
        start_date: startDate,
        end_date: endDate,
        company_id: companyId!,
      });

      // Call solver route and wait for best solution
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      console.log('Auto-Assign Result:', result);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/shift')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('autoAssign')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('autoAssignDescription')}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && <InfoAlert message={error} type="error" />}

      {/* Success message */}
      {success && (
        <InfoAlert message={t('payloadGeneratedSuccess')} type="success" />
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? t('generating') : t('generatePayload')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/shift')}
                disabled={loading}
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
