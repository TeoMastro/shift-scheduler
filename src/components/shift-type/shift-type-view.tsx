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
  Clock,
  Trash2,
  Building2,
} from 'lucide-react';
import { ShiftTypeViewProps } from '@/types/shift-type';
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
import { deleteShiftTypeAction } from '@/server-actions/shift-type';
import { InfoAlert } from '@/components/info-alert';
import { Role } from '@prisma/client';

export function ShiftTypeView({ shiftType }: ShiftTypeViewProps) {
  const router = useRouter();
  const t = useTranslations('app');

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canDelete = (shiftType._count?.shifts || 0) === 0;

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/shift-type')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('viewShiftType')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/shift-type/${shiftType.id}/update`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!canDelete}
                title={!canDelete ? t('cannotDeleteShiftTypeWithShifts') : ''}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteShiftTypeConfirmation', {
                    name: shiftType.name,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                  onClick={async () => {
                    try {
                      await deleteShiftTypeAction(shiftType.id);
                      router.push(
                        `/shift-type?message=shiftTypeDeletedSuccess`
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

      {/* Shift Type Information Card */}
      <Card>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('shiftTypeId')}
                </label>
                <p className="text-lg font-mono">#{shiftType.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{t('name')}</span>
                </label>
                <p className="text-lg font-semibold">{shiftType.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              {shiftType.company && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <Building2 className="h-4 w-4" />
                    <span>{t('company')}</span>
                  </label>
                  <p className="text-lg">{shiftType.company.name}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{t('shifts')}</span>
                </label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {shiftType._count?.shifts || 0} {t('shifts')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Time Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{t('startTime')}</span>
              </label>
              <p className="text-lg">{formatTime(shiftType.start_time)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{t('endTime')}</span>
              </label>
              <p className="text-lg">{formatTime(shiftType.end_time)}</p>
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
                {new Date(shiftType.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{t('updatedAt')}</span>
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(shiftType.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
