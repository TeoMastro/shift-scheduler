'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Calendar, Trash2, Users } from 'lucide-react';
import { SkillViewProps } from '@/types/skill';
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
import { deleteSkillAction } from '@/server-actions/skill';
import { InfoAlert } from '@/components/info-alert';

export function SkillView({ skill }: SkillViewProps) {
  const router = useRouter();
  const t = useTranslations('app');

  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/skill')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('viewSkill')}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/skill/${skill.id}/update`)}
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
                  {t('deleteSkillConfirmation', {
                    name: skill.name,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                  onClick={async () => {
                    try {
                      await deleteSkillAction(skill.id);
                      router.push(`/skill?message=skillDeletedSuccess`);
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

      {/* Skill Information Card */}
      <Card>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('skillId')}
                </label>
                <p className="text-lg font-mono">#{skill.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('name')}
                </label>
                <p className="text-lg">{skill.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{t('assignedUsers')}</span>
                </label>
                <p className="text-lg">{skill._count.users}</p>
              </div>
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
                {new Date(skill.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{t('updatedAt')}</span>
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(skill.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
