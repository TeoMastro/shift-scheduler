'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Trash2,
  User,
  Clock,
} from 'lucide-react';
import { UserHasShiftViewProps } from '@/types/user-has-shift';
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
import { deleteShiftAction } from '@/server-actions/user-has-shift';
import { InfoAlert } from '@/components/info-alert';

export function ShiftView({ shift }: UserHasShiftViewProps) {
  const router = useRouter();
  const t = useTranslations('app');

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getUserDisplayName = (user: { first_name: string | null; last_name: string | null; email: string }) => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.email;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/shift')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('viewShift')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/shift/${shift.id}/update`)}
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
                  {t('deleteShiftConfirmation', {
                    user: getUserDisplayName(shift.user!),
                    date: formatDate(shift.date),
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                  onClick={async () => {
                    try {
                      await deleteShiftAction(shift.id);
                      router.push(
                        `/shift?message=shiftDeletedSuccess`
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

      {/* InfoAlert for delete error */}
      {deleteError && <InfoAlert message={deleteError} type="error" />}

      {/* Shift Information Card */}
      <Card>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('shiftId')}
                </label>
                <p className="text-lg font-mono">#{shift.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{t('user')}</span>
                </label>
                <p className="text-lg font-semibold">
                  {getUserDisplayName(shift.user!)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{t('status')}</span>
                </label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {t(shift.status.toLowerCase())}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shift Type Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t('shiftType')}
              </label>
              <p className="text-lg">{shift.shift_type?.name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{t('date')}</span>
              </label>
              <p className="text-lg">{formatDate(shift.date)}</p>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{t('createdAt')}</span>
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDateTime(shift.created_at)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{t('updatedAt')}</span>
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDateTime(shift.updated_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

