import { z } from 'zod';

/**
 * Form validation schemas for user management
 */

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
  roleId: z.string().min(1, 'Role is required'),
});

export const editUserSchema = createUserSchema.omit({ password: true }).extend({
  password: z.string().optional().nullable(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type EditUserFormData = z.infer<typeof editUserSchema>;
export type UserFormData = CreateUserFormData | EditUserFormData;

/**
 * Get appropriate schema based on edit mode
 */
export const getUserSchema = (isEditMode: boolean) => {
  return isEditMode ? editUserSchema : createUserSchema;
};
