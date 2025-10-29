'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Calendar, Trash2, User } from 'lucide-react';
import { ShiftDatePreferenceViewProps } from '@/types/shift-date-preference';
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
import { deleteShiftDatePreferenceAction } from '@/server-actions/shift-date-preference';
import { InfoAlert } from '@/components/info-alert';
import { Badge } from '@/components/ui/badge';
import { PreferenceType } from '@prisma/client';
import { getPreferenceTypeBadge } from './shift-date-preference-table';

export function ShiftDatePreferenceView({
  preference,
  isEmployee = false,
}: ShiftDatePreferenceViewProps) {
  // Ensure isEmployee is a boolean
  const isEmployeeUser = Boolean(isEmployee);
  const router = useRouter();
  const t = useTranslations('app');

  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const badge = getPreferenceTypeBadge(preference.preference_type, t);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/shift-date-preference')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('viewPreference')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/shift-date-preference/${preference.id}/update`)
            }
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deletePreferenceConfirmation')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                  onClick={async () => {
                    try {
                      await deleteShiftDatePreferenceAction(preference.id);
                      router.push(
                        `/shift-date-preference?message=preferenceDeletedSuccess`
                      );
                    } catch (error) {
                      setDeleteError(
                        error instanceof Error
                          ? t(error.message)
                          : t('unexpectedError')
                      );
                    }
                  }}
                >
                  {t('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {deleteError && <InfoAlert message={deleteError} type="error" />}

      <Card>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('preferenceId')}
                </label>
                <p className="text-lg font-mono">#{preference.id}</p>
              </div>

              {!isEmployeeUser && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{t('user')}</span>
                  </label>
                  <p className="text-lg">
                    {getUserDisplayName(preference.user)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{t('date')}</span>
                </label>
                <p className="text-lg">
                  {new Date(preference.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('preferenceType')}
                </label>
                <p className="text-lg">
                  <Badge variant={badge.variant}>{badge.text}</Badge>
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{t('createdAt')}</span>
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(preference.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{t('updatedAt')}</span>
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(preference.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
