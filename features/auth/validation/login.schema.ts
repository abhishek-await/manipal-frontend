import { z } from 'zod';

export const mobileNumberSchema = z.object({
  countryCode: z.string().default('+91'),
  mobileNumber: z.string()
    .regex(/^\d{10}$/, 'Mobile number must be 10 digits'),
  otpMethod: z.enum(['SMS', 'WhatsApp']),
});

export const otpSchema = z.object({
  otp: z.string()
    .length(4, 'OTP must be 4 digits')
    .regex(/^\d{4}$/, 'OTP must contain only numbers'),
});

export type MobileNumberFormData = z.infer<typeof mobileNumberSchema>;
export type OTPFormData = z.infer<typeof otpSchema>;