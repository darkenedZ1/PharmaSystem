import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantId: z.string().uuid().optional(),
});

export const RegisterTenantSchema = z.object({
  tenantName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(10).max(15),
  planId: z.enum(['starter', 'standard', 'professional', 'enterprise']),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterTenantDto = z.infer<typeof RegisterTenantSchema>;
