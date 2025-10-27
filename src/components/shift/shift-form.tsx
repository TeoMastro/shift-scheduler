'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  createShiftAction,
  updateShiftAction,
} from '@/server-actions/user-has-shift';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserHasShiftFormProps,
  UserHasShiftFormState,
} from '@/types/user-has-shift';
import { InfoAlert } from '@/components/info-alert';

interface ShiftFormWithProps extends UserHasShiftFormProps {
  users: Array<{
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    company_id: number | null;
  }>;
  shiftTypes: Array<{
    id: number;
    name: string;
    start_time: Date;
    end_time: Date;
    company_id: number;
  }>;
  userRole: string;
  userCompanyId: number | null;
}

export function ShiftForm({
  shift,
  mode,
  users,
  shiftTypes,
  userRole,
  userCompanyId,
}: ShiftFormWithProps) {
  const t = useTranslations('app');

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initialState: UserHasShiftFormState = {
    success: false,
    errors: {},
    formData: {
      user_id: shift?.user_id.toString() ?? '',
      shift_type_id: shift?.shift_type_id.toString() ?? '',
      date: shift ? formatDate(shift.date) : '',
      status: shift?.status ?? 'SCHEDULED',
    },
    globalError: null,
  };

  const actionWrapper = async (
    prevState: UserHasShiftFormState,
    formData: FormData
  ): Promise<UserHasShiftFormState> => {
    if (mode === 'create') {
      return createShiftAction(prevState, formData);
    } else {
      return updateShiftAction(shift!.id, prevState, formData);
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
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.email;
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? t('createShift') : t('updateShift')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="space-y-4">
          {state.globalError && (
            <InfoAlert message={t(state.globalError)} type="error" />
          )}

          <div className="space-y-2">
            <Label htmlFor="user_id">{t('user')}</Label>
            <Select
              name="user_id"
              defaultValue={state.formData.user_id || undefined}
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
            {state.errors.user_id && (
              <p className="text-sm text-red-500">
                {getErrorMessage('user_id')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift_type_id">{t('shiftType')}</Label>
            <Select
              name="shift_type_id"
              defaultValue={state.formData.shift_type_id || undefined}
            >
              <SelectTrigger
                className={state.errors.shift_type_id ? 'border-red-500' : ''}
              >
                <SelectValue placeholder={t('selectShiftType')} />
              </SelectTrigger>
              <SelectContent>
                {shiftTypes.map((st) => (
                  <SelectItem key={st.id} value={st.id.toString()}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.errors.shift_type_id && (
              <p className="text-sm text-red-500">
                {getErrorMessage('shift_type_id')}
              </p>
            )}
          </div>

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
            <Label htmlFor="status">{t('status')}</Label>
            <Select name="status" defaultValue={state.formData.status}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHEDULED">
                  {t('scheduledStatus')}
                </SelectItem>
                <SelectItem value="CONFIRMED">
                  {t('confirmedStatus')}
                </SelectItem>
                <SelectItem value="COMPLETED">
                  {t('completedStatus')}
                </SelectItem>
                <SelectItem value="CANCELLED">
                  {t('cancelledStatus')}
                </SelectItem>
                <SelectItem value="NO_SHOW">{t('noShowStatus')}</SelectItem>
              </SelectContent>
            </Select>
            {state.errors.status && (
              <p className="text-sm text-red-500">
                {getErrorMessage('status')}
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
