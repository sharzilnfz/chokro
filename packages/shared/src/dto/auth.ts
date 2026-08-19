// DTOs for authentication: signup and login request payloads.
import { z } from 'zod';

// Validates user registration: email, password, and optional role/institution
export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['INDIVIDUAL', 'PARTNER', 'ADMIN']).default('INDIVIDUAL'),
  institutionId: z.string().optional(),
});
export type SignupInput = z.infer<typeof SignupSchema>;

// Validates login credentials against an existing account
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof LoginSchema>;
