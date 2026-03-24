/**
 * PASSWORD CHANGE SERVICE
 * Handles password reset/change with role-based authorization
 * Prevents unauthorized password changes with proper hierarchy checks
 */

import { Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.model';
import { Role } from '../models/role.model';
import { AuthRequest } from '../middlewares/auth.middleware';
import { recordAudit } from './audit.service';
import { logInfo, logError } from '../utils/logger';
// import { sendPasswordResetEmail } from './expo-push.service';

/**
 * Password validation requirements
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PASSWORD_REQUIREMENTS =
  'Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)';

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): { valid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }

  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, error: PASSWORD_REQUIREMENTS };
  }

  return { valid: true };
};

/**
 * Get user's role name from roleId
 */
const getUserRoleName = async (roleId: any): Promise<string> => {
  if (!roleId) return 'user';
  try {
    const role = await Role.findById(roleId).select('name').lean();
    return (role?.name || 'user').toLowerCase();
  } catch {
    return 'user';
  }
};

/**
 * Check if actor can change target user's password
 * Returns: { allowed: boolean; reason?: string }
 */
const checkPasswordChangePermission = async (
  actorId: string | null,
  targetUserId: string,
  actorRoleId: any,
  targetRoleId: any
): Promise<{ allowed: boolean; reason?: string }> => {
  // Actor changing their own password - always allowed
  if (actorId === targetUserId) {
    return { allowed: true };
  }

  // No actor (should not happen in normal flow)
  if (!actorId) {
    return {
      allowed: false,
      reason: 'Unauthorized: Actor ID required',
    };
  }

  // Get roles
  const actorRole = await getUserRoleName(actorRoleId);
  const targetRole = await getUserRoleName(targetRoleId);

  // Superadmin can change anyone's password
  if (actorRole === 'superadmin') {
    return { allowed: true };
  }

  // Admin can change: users, riders, managers (not superadmin, not other admins)
  if (actorRole === 'admin') {
    if (targetRole === 'superadmin' || targetRole === 'admin') {
      return {
        allowed: false,
        reason: `Admins cannot change ${targetRole} passwords`,
      };
    }
    return { allowed: true };
  }

  // Manager can change: users, riders (not admins, not superadmin, not other managers)
  if (actorRole === 'manager') {
    if (['superadmin', 'admin', 'manager'].includes(targetRole)) {
      return {
        allowed: false,
        reason: `Managers cannot change ${targetRole} passwords`,
      };
    }
    return { allowed: true };
  }

  // Regular users can only change their own password
  return {
    allowed: false,
    reason: 'Users can only change their own password',
  };
};

/**
 * Admin changes another user's password
 * SECURITY: With strict permission checks and audit logging
 */
export const adminChangeUserPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId, newPassword, reason } = req.body;
    const actorId = req.user?.id;
    const actorRoleId = req.user?.roleId;

    // Validation
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Valid user ID is required',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    if (!newPassword) {
      res.status(400).json({
        success: false,
        message: 'New password is required',
        code: 'MISSING_PASSWORD',
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.error,
        code: 'WEAK_PASSWORD',
      });
      return;
    }

    // Find target user
    const targetUser = await User.findById(userId).populate('roleId');
    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Check if superadmin email (protected account)
    if (
      targetUser.email === 'superadmin@example.com' &&
      actorId !== targetUser._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'Cannot change superadmin password via this endpoint',
        code: 'SUPERADMIN_PROTECTED',
      });
      return;
    }

    // SECURITY: Check permission hierarchy
    const permissionCheck = await checkPasswordChangePermission(
      actorId,
      userId,
      actorRoleId,
      targetUser.roleId
    );

    if (!permissionCheck.allowed) {
      logError('PasswordChange: Unauthorized attempt', {
        actor: actorId,
        target: userId,
        reason: permissionCheck.reason,
      });

      res.status(403).json({
        success: false,
        message: permissionCheck.reason || 'You do not have permission to change this user password',
        code: 'PERMISSION_DENIED',
      });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const oldPassword = targetUser.password; // For audit
    targetUser.password = hashedPassword;
    await targetUser.save();

    /**
     * AUDIT: Log password change for security and compliance
     */
    recordAudit({
      actorId: actorId || null,
      action: 'password_reset',
      resource: 'user_password',
      resourceId: userId,
      before: { passwordHash: oldPassword?.substring(0, 10) + '...' }, // Don't log full hash
      after: { passwordHash: hashedPassword.substring(0, 10) + '...' },
      meta: {
        targetUserEmail: targetUser.email,
        targetRole: (targetUser.roleId as any)?.name || 'unknown',
        reason: reason || 'Admin password reset',
        isAdminReset: actorId !== userId,
      },
    }).catch((err) => {
      logError('PasswordChange: Audit logging failed', err);
    });

    // Send email notification to user
    sendPasswordResetNotification(targetUser.email, targetUser.name, actorId !== userId)
      .catch((err) => {
        logError('PasswordChange: Email notification failed', err);
      });

    logInfo('PasswordChange: Password updated successfully', {
      actor: actorId,
      target: userId,
      targetEmail: targetUser.email,
    });

    res.json({
      success: true,
      message: `Password has been reset for ${targetUser.email}`,
      code: 'PASSWORD_RESET_SUCCESS',
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
      },
    });
  } catch (err) {
    logError('PasswordChange: Error', err);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      code: 'RESET_FAILED',
    });
  }
};

/**
 * User changes their own password
 * Old password is required for verification
 */
export const userChangeOwnPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!oldPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Both old and new passwords are required',
        code: 'MISSING_PASSWORDS',
      });
      return;
    }

    if (oldPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: 'New password must be different from old password',
        code: 'SAME_PASSWORD',
      });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.error,
        code: 'WEAK_PASSWORD',
      });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      logError('PasswordChange: Invalid old password attempt', {
        userId,
        userEmail: user.email,
      });

      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_PASSWORD',
      });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const oldPasswordHash = user.password;

    // Update password
    user.password = hashedPassword;
    await user.save();

    /**
     * AUDIT: Log password change for security
     */
    recordAudit({
      actorId: userId,
      action: 'password_change',
      resource: 'user_password',
      resourceId: userId,
      before: { passwordHash: oldPasswordHash.substring(0, 10) + '...' },
      after: { passwordHash: hashedPassword.substring(0, 10) + '...' },
      meta: {
        userEmail: user.email,
        changeType: 'self_initiated',
      },
    }).catch((err) => {
      logError('PasswordChange: Audit logging failed', err);
    });

    logInfo('PasswordChange: User password changed successfully', {
      userId,
      userEmail: user.email,
    });

    res.json({
      success: true,
      message: 'Password has been changed successfully',
      code: 'PASSWORD_CHANGED_SUCCESS',
    });
  } catch (err) {
    logError('PasswordChange: Error', err);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      code: 'CHANGE_FAILED',
    });
  }
};

/**
 * Send password reset/change notification email
 */
async function sendPasswordResetNotification(
  email: string,
  name: string,
  isAdminReset: boolean
): Promise<void> {
  // TODO: Integrate with email service
  // For now, just log
  logInfo('PasswordChange: Email notification', {
    to: email,
    name,
    isAdminReset,
    subject: isAdminReset ? 'Your password has been reset by admin' : 'Your password was changed',
  });
}

export default {
  validatePasswordStrength,
  adminChangeUserPassword,
  userChangeOwnPassword,
  PASSWORD_REQUIREMENTS,
  PASSWORD_MIN_LENGTH,
};
