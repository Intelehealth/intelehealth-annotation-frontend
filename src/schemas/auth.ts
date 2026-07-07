import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Signup validation schema
export const signupSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Password strength checks
export const PASSWORD_CHECKS = [
  { test: (val: string) => val.length >= 8, label: '8+ characters', error: 'Must be at least 8 characters' },
  { test: (val: string) => /[A-Z]/.test(val), label: 'One uppercase', error: 'Must contain an uppercase letter' },
  { test: (val: string) => /[a-z]/.test(val), label: 'One lowercase', error: 'Must contain a lowercase letter' },
  { test: (val: string) => /[0-9]/.test(val), label: 'One number', error: 'Must contain a number' },
  { test: (val: string) => /[^A-Za-z0-9]/.test(val), label: 'One special character', error: 'Must contain a special character' },
] as const;

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
