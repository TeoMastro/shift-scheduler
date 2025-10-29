import { z } from 'zod';
import { Role, Status, ShiftStatus, PreferenceType, LeaveType } from '@prisma/client';

export const signinSchema = z.object({
  email: z.email('invalidEmail'),
  password: z.string().min(1, 'passwordTooShort').min(6, 'passwordTooShort'),
});

export const signupSchema = z
  .object({
    first_name: z.string().min(2, 'firstNameTooShort'),
    last_name: z.string().min(2, 'lastNameTooShort'),
    email: z.email('invalidEmail'),
    password: z
      .string()
      .min(8, 'passwordTooShort')
      .regex(/[a-z]/, 'passwordNeedsLowercase')
      .regex(/\d/, 'passwordNeedsNumber')
      .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/,
        'passwordNeedsSpecialChar'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordsDontMatch',
    path: ['confirmPassword'],
  });

export const createUserSchema = z
  .object({
    first_name: z.string().min(1, 'firstNameRequired'),
    last_name: z.string().min(1, 'lastNameRequired'),
    email: z.email('invalidEmail'),
    password: z.string().min(6, 'passwordMinLength'),
    role: z.enum([Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    status: z.enum([Status.ACTIVE, Status.INACTIVE, Status.UNVERIFIED]),
    company_id: z.string().optional(),
  })
  .refine(
    (data) => {
      // If role is not ADMIN, company_id is required
      if (data.role !== Role.ADMIN) {
        return !!(data.company_id && data.company_id.trim() !== '');
      }
      return true;
    },
    {
      message: 'companyRequired',
      path: ['company_id'],
    }
  );

export const updateUserSchema = z
  .object({
    first_name: z.string().min(1, 'firstNameRequired'),
    last_name: z.string().min(1, 'lastNameRequired'),
    email: z.email('invalidEmail'),
    password: z
      .string()
      .optional()
      .refine((val) => {
        if (val && val.length > 0) {
          return val.length >= 6;
        }
        return true;
      }, 'passwordMinLength'),
    role: z.enum([Role.ADMIN, Role.EMPLOYEE, Role.MANAGER]),
    status: z.enum([Status.ACTIVE, Status.INACTIVE, Status.UNVERIFIED]),
    company_id: z.string().optional(),
  })
  .refine(
    (data) => {
      // If role is not ADMIN, company_id is required
      if (data.role !== Role.ADMIN) {
        return !!(data.company_id && data.company_id.trim() !== '');
      }
      return true;
    },
    {
      message: 'companyRequired',
      path: ['company_id'],
    }
  );

export const forgotPasswordSchema = z.object({
  email: z.email('invalidEmail').min(1, 'emailRequired'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'passwordMinLength'),
    confirmPassword: z.string().min(1, 'confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

export function formatZodErrors(error: z.ZodError) {
  const fieldErrors: { [key: string]: string[] } = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  return fieldErrors;
}

export const createCompanySchema = z.object({
  name: z.string().min(1, 'companyNameRequired').max(64, 'companyNameTooLong'),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1, 'companyNameRequired').max(64, 'companyNameTooLong'),
});

export const createShiftTypeSchema = z
  .object({
    name: z
      .string()
      .min(1, 'shiftTypeNameRequired')
      .max(100, 'shiftTypeNameTooLong'),
    start_time: z.string().min(1, 'startTimeRequired'),
    end_time: z.string().min(1, 'endTimeRequired'),
    company_id: z.string().min(1, 'companyRequired'),
  })
  .refine((data) => data.start_time !== data.end_time, {
    message: 'startTimeCannotEqualEndTime',
    path: ['end_time'],
  });

export const updateShiftTypeSchema = z
  .object({
    name: z
      .string()
      .min(1, 'shiftTypeNameRequired')
      .max(100, 'shiftTypeNameTooLong'),
    start_time: z.string().min(1, 'startTimeRequired'),
    end_time: z.string().min(1, 'endTimeRequired'),
  })
  .refine((data) => data.start_time !== data.end_time, {
    message: 'startTimeCannotEqualEndTime',
    path: ['end_time'],
  });

export const createUserHasShiftSchema = z.object({
  user_id: z.string().min(1, 'userRequired'),
  shift_type_id: z.string().min(1, 'shiftTypeRequired'),
  date: z.string().min(1, 'dateRequired'),
  status: z.enum([
    ShiftStatus.SCHEDULED,
    ShiftStatus.CONFIRMED,
    ShiftStatus.COMPLETED,
    ShiftStatus.CANCELLED,
    ShiftStatus.NO_SHOW,
  ]),
});

export const updateUserHasShiftSchema = z.object({
  user_id: z.string().min(1, 'userRequired'),
  shift_type_id: z.string().min(1, 'shiftTypeRequired'),
  date: z.string().min(1, 'dateRequired'),
  status: z.enum([
    ShiftStatus.SCHEDULED,
    ShiftStatus.CONFIRMED,
    ShiftStatus.COMPLETED,
    ShiftStatus.CANCELLED,
    ShiftStatus.NO_SHOW,
  ]),
});

export const createSkillSchema = z.object({
  name: z.string().min(1, 'skillNameRequired').max(100, 'skillNameTooLong'),
  company_id: z.string().optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1, 'skillNameRequired').max(100, 'skillNameTooLong'),
  company_id: z.string().optional(),
});

export const createShiftDatePreferenceSchema = z.object({
  user_id: z.string().min(1, 'userRequired'),
  date: z.string().min(1, 'dateRequired'),
  preference_type: z.enum([PreferenceType.DESIRED, PreferenceType.UNDESIRED]),
});

export const updateShiftDatePreferenceSchema = z.object({
  user_id: z.string().min(1, 'userRequired'),
  date: z.string().min(1, 'dateRequired'),
  preference_type: z.enum([PreferenceType.DESIRED, PreferenceType.UNDESIRED]),
});

export const createUnavailableDateSchema = z
  .object({
    user_id: z.string().min(1, 'userRequired'),
    start_date: z.string().min(1, 'startDateRequired'),
    end_date: z.string().min(1, 'endDateRequired'),
    leave_type: z.enum([
      LeaveType.SICK_LEAVE,
      LeaveType.VACATION,
      LeaveType.PERSONAL_LEAVE,
      LeaveType.UNPAID_LEAVE,
      LeaveType.OTHER,
    ]),
    reason: z.string().optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      return endDate >= startDate;
    },
    {
      message: 'endDateMustBeAfterStartDate',
      path: ['end_date'],
    }
  );

export const updateUnavailableDateSchema = z
  .object({
    user_id: z.string().min(1, 'userRequired'),
    start_date: z.string().min(1, 'startDateRequired'),
    end_date: z.string().min(1, 'endDateRequired'),
    leave_type: z.enum([
      LeaveType.SICK_LEAVE,
      LeaveType.VACATION,
      LeaveType.PERSONAL_LEAVE,
      LeaveType.UNPAID_LEAVE,
      LeaveType.OTHER,
    ]),
    reason: z.string().optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      return endDate >= startDate;
    },
    {
      message: 'endDateMustBeAfterStartDate',
      path: ['end_date'],
    }
  );
