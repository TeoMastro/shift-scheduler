'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  createShiftDatePreferenceAction,
  updateShiftDatePreferenceAction,
} from '@/server-actions/shift-date-preference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShiftDatePreferenceFormProps,
  ShiftDatePreferenceFormState,
} from '@/types/shift-date-preference';
import { PreferenceType } from '@prisma/client';
import { InfoAlert } from '../info-alert';

export function ShiftDatePreferenceForm({
  preference,
  mode,
  users = [],
  currentUserId,
  isEmployee = false,
}: ShiftDatePreferenceFormProps) {
  // Ensure isEmployee is a boolean
  const isEmployeeUser = Boolean(isEmployee);
  const t = useTranslations('app');

  const [selectedUserId, setSelectedUserId] = useState<string>(
    isEmployeeUser && currentUserId
      ? currentUserId.toString()
      : (preference?.user_id?.toString() ?? users[0]?.id?.toString() ?? '')
  );
  const [selectedPreferenceType, setSelectedPreferenceType] =
    useState<PreferenceType>(
      preference?.preference_type ?? PreferenceType.DESIRED
    );

  const initialState: ShiftDatePreferenceFormState = {
    success: false,
    errors: {},
    formData: {
      user_id:
        isEmployeeUser && currentUserId
          ? currentUserId.toString()
          : (preference?.user_id?.toString() ?? users[0]?.id?.toString() ?? ''),
      date: preference
        ? new Date(preference.date).toISOString().split('T')[0]
        : '',
      preference_type: preference?.preference_type ?? PreferenceType.DESIRED,
    },
    globalError: null,
  };

  const actionWrapper = async (
    prevState: ShiftDatePreferenceFormState,
    formData: FormData
  ): Promise<ShiftDatePreferenceFormState> => {
    if (mode === 'create') {
      return createShiftDatePreferenceAction(prevState, formData);
    } else {
      return updateShiftDatePreferenceAction(
        preference!.id,
        prevState,
        formData
      );
    }
  };

  const [state, formAction] = useActionState(actionWrapper, initialState);

  const getErrorMessage = (field: string) => {
    const errs = state.errors[field];
    if (!errs || errs.length === 0) return null;
    return t(errs[0]);
  };

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

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create'
            ? t('createShiftDatePreference')
            : t('updateShiftDatePreference')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="space-y-4">
          {state.globalError && (
            <InfoAlert message={t(state.globalError)} type="error" />
          )}

          {!isEmployeeUser && (
            <div className="space-y-2">
              <Label htmlFor="user_id">{t('user')}</Label>
              <Select
                value={selectedUserId}
                onValueChange={(value) => setSelectedUserId(value)}
                required
              >
                <SelectTrigger
                  className={state.errors.user_id ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder={t('selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {getUserDisplayName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="user_id" value={selectedUserId} />
              {state.errors.user_id && (
                <p className="text-sm text-red-500">
                  {getErrorMessage('user_id')}
                </p>
              )}
            </div>
          )}

          {isEmployeeUser && (
            <input
              type="hidden"
              name="user_id"
              value={currentUserId?.toString() ?? ''}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="date">{t('date')}</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={state.formData.date}
              className={state.errors.date ? 'border-red-500' : ''}
              required
            />
            {state.errors.date && (
              <p className="text-sm text-red-500">{getErrorMessage('date')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preference_type">{t('preferenceType')}</Label>
            <Select
              value={selectedPreferenceType}
              onValueChange={(value) =>
                setSelectedPreferenceType(value as PreferenceType)
              }
              required
            >
              <SelectTrigger
                className={state.errors.preference_type ? 'border-red-500' : ''}
              >
                <SelectValue placeholder={t('selectPreferenceType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PreferenceType.DESIRED}>
                  {t('desired')}
                </SelectItem>
                <SelectItem value={PreferenceType.UNDESIRED}>
                  {t('undesired')}
                </SelectItem>
              </SelectContent>
            </Select>
            <input
              type="hidden"
              name="preference_type"
              value={selectedPreferenceType}
            />
            {state.errors.preference_type && (
              <p className="text-sm text-red-500">
                {getErrorMessage('preference_type')}
              </p>
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
