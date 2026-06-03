import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  userName: z.string().min(3),
  fullName: z.string().min(1),
  password: z.string().min(8),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RefreshSchema = z.object({
  refreshToken: z.string(),
});

export const ActivateAccountSchema = z
  .object({
    token: z.string(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });