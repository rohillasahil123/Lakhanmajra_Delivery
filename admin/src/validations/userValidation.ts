import { z } from 'zod';

export const userValidationSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z
    .string()
    .regex(/^\d{10,}$/, 'Phone must be at least 10 digits')
    .max(20, 'Phone must be less than 20 digits'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters')
    .optional()
    .or(z.literal('')),
  roleId: z.string().nonempty('Role is required'),
  isActive: z.boolean().optional().default(true),
});

export type UserFormData = z.infer<typeof userValidationSchema>;

// Schema for updating user (password optional)
export const userUpdateValidationSchema = userValidationSchema.pick({
  name: true,
  email: true,
  phone: true,
  roleId: true,
  isActive: true,
});

export type UserUpdateFormData = z.infer<typeof userUpdateValidationSchema>;
