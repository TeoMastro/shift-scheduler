'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createSkillAction, updateSkillAction } from '@/server-actions/skill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkillFormProps, SkillFormState } from '@/types/skill';
import { InfoAlert } from '../info-alert';

export function SkillForm({ skill, mode, companies = [] }: SkillFormProps) {
  const t = useTranslations('app');

  const initialState: SkillFormState = {
    success: false,
    errors: {},
    formData: {
      name: skill?.name ?? '',
      company_id: skill?.company_id?.toString() ?? '',
    },
    globalError: null,
  };

  const actionWrapper = async (
    prevState: SkillFormState,
    formData: FormData
  ): Promise<SkillFormState> => {
    if (mode === 'create') {
      return createSkillAction(prevState, formData);
    } else {
      return updateSkillAction(skill!.id, prevState, formData);
    }
  };

  const [state, formAction] = useActionState(actionWrapper, initialState);

  const getErrorMessage = (field: string) => {
    const errs = state.errors[field];
    if (!errs || errs.length === 0) return null;
    return t(errs[0]);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? t('createSkill') : t('updateSkill')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="space-y-4">
          {state.globalError && (
            <InfoAlert message={t(state.globalError)} type="error" />
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={state.formData.name}
              className={state.errors.name ? 'border-red-500' : ''}
              required
            />
            {state.errors.name && (
              <p className="text-sm text-red-500">{getErrorMessage('name')}</p>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="submit">
              {mode === 'create' ? t('create') : t('update')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
