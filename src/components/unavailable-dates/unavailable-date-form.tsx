'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  createUnavailableDateAction,
  updateUnavailableDateAction,
} from '@/server-actions/unavailable-date';
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
  UnavailableDateFormProps,
  UnavailableDateFormState,
} from '@/types/unavailable-date';
import { LeaveType } from '@prisma/client';
import { InfoAlert } from '../info-alert';

export function UnavailableDateForm({
  unavailableDate,
  mode,
  users = [],
  currentUserId,
  isEmployee = false,
}: UnavailableDateFormProps) {
  // Ensure isEmployee is a boolean
  const isEmployeeUser = Boolean(isEmployee);
  const t = useTranslations('app');

  const [selectedUserId, setSelectedUserId] = useState<string>(
    isEmployeeUser && currentUserId
      ? currentUserId.toString()
      : (unavailableDate?.user_id?.toString() ?? users[0]?.id?.toString() ?? '')
  );
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType>(
    unavailableDate?.leave_type ?? LeaveType.SICK_LEAVE
  );

  const initialState: UnavailableDateFormState = {
    success: false,
    errors: {},
    formData: {
      user_id:
        isEmployeeUser && currentUserId
          ? currentUserId.toString()
          : (unavailableDate?.user_id?.toString() ??
            users[0]?.id?.toString() ??
            ''),
      start_date: unavailableDate
        ? new Date(unavailableDate.start_date).toISOString().split('T')[0]
        : '',
      end_date: unavailableDate
        ? new Date(unavailableDate.end_date).toISOString().split('T')[0]
        : '',
      leave_type: unavailableDate?.leave_type ?? LeaveType.SICK_LEAVE,
      reason: unavailableDate?.reason ?? '',
    },
    globalError: null,
  };

  const actionWrapper = async (
    prevState: UnavailableDateFormState,
    formData: FormData
  ): Promise<UnavailableDateFormState> => {
    if (mode === 'create') {
      return createUnavailableDateAction(prevState, formData);
    } else {
      return updateUnavailableDateAction(
        unavailableDate!.id,
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
            ? t('createUnavailableDate')
            : t('updateUnavailableDate')}
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
            <Label htmlFor="start_date">{t('startDate')}</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={state.formData.start_date}
              className={state.errors.start_date ? 'border-red-500' : ''}
              required
            />
            {state.errors.start_date && (
              <p className="text-sm text-red-500">
                {getErrorMessage('start_date')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">{t('endDate')}</Label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              defaultValue={state.formData.end_date}
              className={state.errors.end_date ? 'border-red-500' : ''}
              required
            />
            {state.errors.end_date && (
              <p className="text-sm text-red-500">
                {getErrorMessage('end_date')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave_type">{t('leaveType')}</Label>
            <Select
              value={selectedLeaveType}
              onValueChange={(value) =>
                setSelectedLeaveType(value as LeaveType)
              }
              required
            >
              <SelectTrigger
                className={state.errors.leave_type ? 'border-red-500' : ''}
              >
                <SelectValue placeholder={t('selectLeaveType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LeaveType.SICK_LEAVE}>
                  {t('sickLeave')}
                </SelectItem>
                <SelectItem value={LeaveType.VACATION}>
                  {t('vacation')}
                </SelectItem>
                <SelectItem value={LeaveType.PERSONAL_LEAVE}>
                  {t('personalLeave')}
                </SelectItem>
                <SelectItem value={LeaveType.UNPAID_LEAVE}>
                  {t('unpaidLeave')}
                </SelectItem>
                <SelectItem value={LeaveType.OTHER}>{t('other')}</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="leave_type" value={selectedLeaveType} />
            {state.errors.leave_type && (
              <p className="text-sm text-red-500">
                {getErrorMessage('leave_type')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('reason')}</Label>
            <Input
              id="reason"
              name="reason"
              type="text"
              defaultValue={state.formData.reason}
              className={state.errors.reason ? 'border-red-500' : ''}
              placeholder={t('reasonPlaceholder')}
            />
            {state.errors.reason && (
              <p className="text-sm text-red-500">
                {getErrorMessage('reason')}
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
