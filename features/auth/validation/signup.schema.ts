import { z } from 'zod';
import { da } from 'zod/locales';

export const signupSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters'),
  email: z
    .email('Please enter a valid email address'),
  dateOfBirth: z.string()
    .regex(/^(?:(?:31\/(?:0[13578]|1[02])\/\d{4})|(?:30\/(?:0[469]|11)\/\d{4})|(?:29\/02\/(?:(?:\d{2}(?:0[48]|[2468][048]|[13579][26]))|(?:[02468][048]|[13579][26])00))|(?:0[1-9]|1\d|2[0-8])\/(?:0[1-9]|1[0-2])\/\d{4})$/
, 'Invalid Date')
    .refine((date) => {
      const [day, month, year] = date.split('/').map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13;
    }, 'You must be at least 13 years old'),
  gender: z.enum(['Male', 'Female', 'Others']).nullable(),
  hasReferralCode: z.boolean().default(false).optional(),
  referralCode: z.string().optional().or(z.literal("")).optional()
}).refine((data) => !data.hasReferralCode || !!data.referralCode?.trim(), { path: ['referralCode'], message: 'Referral code is required'})

export type SignupFormData = z.infer<typeof signupSchema>;