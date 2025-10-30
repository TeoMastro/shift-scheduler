'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  createShiftTypeAction,
  updateShiftTypeAction,
} from '@/server-actions/shift-type';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShiftTypeFormProps, ShiftTypeFormState } from '@/types/shift-type';
import { InfoAlert } from '@/components/info-alert';

export function ShiftTypeForm({
  shiftType,
  mode,
  availableSkills,
  selectedSkillIds = [],
}: ShiftTypeFormProps) {
  const t = useTranslations('app');

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const initialState: ShiftTypeFormState = {
    success: false,
    errors: {},
    formData: {
      name: shiftType?.name ?? '',
      start_time: shiftType ? formatTime(shiftType.start_time) : '',
      end_time: shiftType ? formatTime(shiftType.end_time) : '',
      skill_ids: selectedSkillIds.map((id) => String(id)),
    },
    globalError: null,
  };

  const actionWrapper = async (
    prevState: ShiftTypeFormState,
    formData: FormData
  ): Promise<ShiftTypeFormState> => {
    if (mode === 'create') {
      return createShiftTypeAction(prevState, formData);
    } else {
      return updateShiftTypeAction(shiftType!.id, prevState, formData);
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
          {mode === 'create' ? t('createShiftType') : t('updateShiftType')}
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
              placeholder={t('enterShiftTypeName')}
              required
            />
            {state.errors.name && (
              <p className="text-sm text-red-500">{getErrorMessage('name')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">{t('startTime')}</Label>
            <Input
              id="start_time"
              name="start_time"
              type="time"
              defaultValue={state.formData.start_time}
              className={state.errors.start_time ? 'border-red-500' : ''}
              required
            />
            {state.errors.start_time && (
              <p className="text-sm text-red-500">
                {getErrorMessage('start_time')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_time">{t('endTime')}</Label>
            <Input
              id="end_time"
              name="end_time"
              type="time"
              defaultValue={state.formData.end_time}
              className={state.errors.end_time ? 'border-red-500' : ''}
              required
            />
            {state.errors.end_time && (
              <p className="text-sm text-red-500">
                {getErrorMessage('end_time')}
              </p>
            )}
          </div>

          {/* Skills multi-select (checkbox list) */}
          <div className="space-y-2">
            <Label>{t('skills')}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 max-h-64 overflow-auto">
              {availableSkills.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('noSkillsFound')}
                </p>
              )}
              {availableSkills.map((skill) => (
                <label key={skill.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="skill_ids"
                    value={skill.id}
                    defaultChecked={selectedSkillIds.includes(skill.id)}
                    className="h-4 w-4"
                  />
                  <span>{skill.name}</span>
                </label>
              ))}
            </div>
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
