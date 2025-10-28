'use client';

import { useActionState, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createUserAction, updateUserAction } from '@/server-actions/user';
import { getSkillsForCompany } from '@/server-actions/user';
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
import { UserFormProps, UserFormState } from '@/types/user';
import { Role, Status } from '@prisma/client';
import { InfoAlert } from '../info-alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Skill {
  id: number;
  name: string;
}

export function UserForm({ user, mode, companies = [] }: UserFormProps) {
  const t = useTranslations('app');
  const [selectedRole, setSelectedRole] = useState<Role>(
    user?.role || Role.EMPLOYEE
  );
  const [selectedCompany, setSelectedCompany] = useState<string>(
    user?.company_id?.toString() ?? ''
  );
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>(
    user?.skills?.map((s: Skill) => s.id) ?? []
  );
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);

  // Load skills when company is selected
  useEffect(() => {
    const loadSkills = async () => {
      if (selectedCompany) {
        setIsLoadingSkills(true);
        try {
          const skills = await getSkillsForCompany(parseInt(selectedCompany));
          setAvailableSkills(skills);
          // Clear selected skills only if company changes AND we're creating
          if (mode === 'create') {
            setSelectedSkillIds([]);
          } else if (mode === 'update' && user) {
            // In update mode, filter to keep only skills that belong to the selected company
            const companySkillIds = skills.map((s) => s.id);
            setSelectedSkillIds((prev) =>
              prev.filter((id) => companySkillIds.includes(id))
            );
          }
        } catch (error) {
          console.error('Error loading skills:', error);
          setAvailableSkills([]);
        } finally {
          setIsLoadingSkills(false);
        }
      } else {
        setAvailableSkills([]);
        setSelectedSkillIds([]);
      }
    };

    loadSkills();
  }, [selectedCompany, mode, user]);

  const initialState: UserFormState = {
    success: false,
    errors: {},
    formData: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email || '',
      password: '',
      role: user?.role || Role.EMPLOYEE,
      status: user?.status || Status.ACTIVE,
      company_id: user?.company_id?.toString() ?? '',
    },
    globalError: null,
  };

  const actionWrapper = async (
    prevState: UserFormState,
    formData: FormData
  ): Promise<UserFormState> => {
    if (mode === 'create') {
      return createUserAction(prevState, formData);
    } else {
      return updateUserAction(user!.id, prevState, formData);
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
          {mode === 'create' ? t('createUser') : t('updateUser')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="space-y-4">
          {state.globalError && (
            <InfoAlert message={t(state.globalError)} type="error" />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t('firstName')}</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={state.formData.first_name}
                className={state.errors.first_name ? 'border-red-500' : ''}
                required
              />
              {state.errors.first_name && (
                <p className="text-sm text-red-500">
                  {getErrorMessage('first_name')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">{t('lastName')}</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={state.formData.last_name}
                className={state.errors.last_name ? 'border-red-500' : ''}
                required
              />
              {state.errors.last_name && (
                <p className="text-sm text-red-500">
                  {getErrorMessage('last_name')}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={state.formData.email}
              className={state.errors.email ? 'border-red-500' : ''}
              required
            />
            {state.errors.email && (
              <p className="text-sm text-red-500">{getErrorMessage('email')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {t('password')}
              {mode === 'update' && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({t('leaveEmptyToKeepCurrent')})
                </span>
              )}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              className={state.errors.password ? 'border-red-500' : ''}
              required={mode === 'create'}
            />
            {state.errors.password && (
              <p className="text-sm text-red-500">
                {getErrorMessage('password')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">{t('role')}</Label>
              <Select
                name="role"
                defaultValue={state.formData.role}
                onValueChange={(value) => setSelectedRole(value as Role)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t('adminRole')}</SelectItem>
                  <SelectItem value="EMPLOYEE">{t('employeeRole')}</SelectItem>
                  <SelectItem value="MANAGER">{t('managerRole')}</SelectItem>
                </SelectContent>
              </Select>
              {state.errors.role && (
                <p className="text-sm text-red-500">
                  {getErrorMessage('role')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('status')}</Label>
              <Select name="status" defaultValue={state.formData.status}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t('activeStatus')}</SelectItem>
                  <SelectItem value="INACTIVE">
                    {t('inactiveStatus')}
                  </SelectItem>
                  <SelectItem value="UNVERIFIED">
                    {t('unverifiedStatus')}
                  </SelectItem>
                </SelectContent>
              </Select>
              {state.errors.status && (
                <p className="text-sm text-red-500">
                  {getErrorMessage('status')}
                </p>
              )}
            </div>
          </div>

          {selectedRole !== Role.ADMIN && (
            <div className="space-y-2">
              <Label htmlFor="company_id">{t('company')}</Label>
              <Select
                name="company_id"
                defaultValue={state.formData.company_id || undefined}
                onValueChange={(value) => setSelectedCompany(value)}
              >
                <SelectTrigger
                  className={state.errors.company_id ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder={t('selectCompany')} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors.company_id && (
                <p className="text-sm text-red-500">
                  {getErrorMessage('company_id')}
                </p>
              )}
            </div>
          )}

          {/* Skills Selection Section */}
          {selectedRole !== Role.ADMIN && selectedCompany && (
            <div className="space-y-2">
              <Label>{t('selectSkills')}</Label>
              <ScrollArea className="h-48 w-full rounded-md border p-4">
                {isLoadingSkills ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : availableSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('noSkillsFound')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          id={`skill-${skill.id}`}
                          name="skill_ids"
                          value={skill.id.toString()}
                          checked={selectedSkillIds.includes(skill.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSkillIds([
                                ...selectedSkillIds,
                                skill.id,
                              ]);
                            } else {
                              setSelectedSkillIds(
                                selectedSkillIds.filter((id) => id !== skill.id)
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <label
                          htmlFor={`skill-${skill.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {skill.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

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
