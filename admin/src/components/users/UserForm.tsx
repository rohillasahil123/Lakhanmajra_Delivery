import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userValidationSchema, userUpdateValidationSchema } from '../../validations/userValidation';
import { IRole } from '../../hooks/useUserInit';

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  roles: IRole[];
  editingUser?: { _id: string; name: string; email: string; phone: string; roleId?: { _id: string; name: string } } | null;
  loading?: boolean;
}

/**
 * User form component with react-hook-form validation
 * Handles both create and edit modes with Zod schema validation
 */
export function UserForm({
  open,
  onClose,
  onSubmit,
  roles,
  editingUser,
  loading = false,
}: Readonly<UserFormProps>) {
  const isEditing = !!editingUser;
  const schema = isEditing ? userUpdateValidationSchema : userValidationSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<any>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: isEditing
      ? {
          name: editingUser?.name || '',
          email: editingUser?.email || '',
          phone: editingUser?.phone || '',
          roleId: editingUser?.roleId?._id || '',
          isActive: true,
        }
      : {
          name: '',
          email: '',
          phone: '',
          password: '',
          roleId: '',
          isActive: true,
        },
  });

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data as Record<string, unknown>);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 500,
          width: '90%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: '#0f1623' }}>
          {isEditing ? 'Edit User' : 'Create User'}
        </h2>

        <form onSubmit={handleSubmit(handleFormSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name Field */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: '#0f1623' }}>
              Name *
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="Enter full name"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.name ? '1px solid #ef4444' : '1px solid #e8eaf0',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {errors.name && <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>{String(errors.name?.message)}</span>}
          </div>

          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: '#0f1623' }}>
              Email *
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="Enter email address"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.email ? '1px solid #ef4444' : '1px solid #e8eaf0',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {errors.email && <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>{String(errors.email?.message)}</span>}
          </div>

          {/* Phone Field */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: '#0f1623' }}>
              Phone *
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="Enter phone number"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.phone ? '1px solid #ef4444' : '1px solid #e8eaf0',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {errors.phone && <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>{String(errors.phone?.message)}</span>}
          </div>

          {/* Password Field (only for create) */}
          {!isEditing && (
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: '#0f1623' }}>
                Password *
              </label>
              <input
                {...register('password' as any)}
                type="password"
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: (errors as any).password ? '1px solid #ef4444' : '1px solid #e8eaf0',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              {(errors as any).password && <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>{String((errors as any).password?.message)}</span>}
            </div>
          )}

          {/* Role Field */}
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: '#0f1623' }}>
              Role *
            </label>
            <select
              {...register('roleId')}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.roleId ? '1px solid #ef4444' : '1px solid #e8eaf0',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Select a role</option>
              {roles
                .filter((role) => role.name.toLowerCase() !== 'superadmin')
                .map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
            </select>
            {errors.roleId && <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>{String(errors.roleId?.message)}</span>}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid #e8eaf0',
                background: '#fff',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                background: '#3b6ef8',
                color: '#fff',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: loading ? 0.6 : 1,
              }}
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
