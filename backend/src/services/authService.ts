import { User, Organization, OrganizationUser, Role } from '@/models';
import { prisma } from '@/config/database';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/utils/password';
import { generateTokenPair, createJWTPayload, TokenPair } from '@/utils/jwt';
import { logger } from '@/config/logger';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  organizationName?: string;
  organizationSlug?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  organizationId?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: Role;
  };
  tokens: TokenPair;
}

class AuthService {
  /**
   * Register a new user and optionally create an organization
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Check username uniqueness if provided
      if (data.username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username: data.username }
        });

        if (existingUsername) {
          throw new Error('Username is already taken');
        }
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            username: data.username,
            firstName: data.firstName,
            lastName: data.lastName,
            passwordHash,
            emailVerified: new Date(), // Auto-verify for now
          }
        });

        let organization: Organization | null = null;
        let organizationUser: OrganizationUser | null = null;

        // Create organization if requested
        if (data.organizationName && data.organizationSlug) {
          // Check if organization slug is available
          const existingOrg = await tx.organization.findUnique({
            where: { slug: data.organizationSlug }
          });

          if (existingOrg) {
            throw new Error('Organization slug is already taken');
          }

          // Create organization
          organization = await tx.organization.create({
            data: {
              name: data.organizationName,
              slug: data.organizationSlug,
              createdBy: user.id
            }
          });

          // Add user as organization owner
          organizationUser = await tx.organizationUser.create({
            data: {
              userId: user.id,
              organizationId: organization.id,
              role: Role.OWNER
            }
          });
        }

        return { user, organization, organizationUser };
      });

      // Generate tokens
      const jwtPayload = createJWTPayload(
        result.user,
        result.organization?.id,
        result.organizationUser?.role
      );
      const tokens = generateTokenPair(jwtPayload);

      // Log registration
      await this.logAuditEvent(
        'user.registered',
        'user',
        result.user.id,
        result.user.id,
        result.organization?.id,
        { email: result.user.email }
      );

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName || undefined,
          lastName: result.user.lastName || undefined,
          username: result.user.username || undefined,
        },
        organization: result.organization ? {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          role: result.organizationUser!.role
        } : undefined,
        tokens
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        include: {
          organizations: {
            include: {
              organization: true
            }
          }
        }
      });

      if (!user || !user.passwordHash) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await verifyPassword(data.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Determine organization context
      let organizationUser: OrganizationUser & { organization: Organization } | null = null;

      if (data.organizationId) {
        // Specific organization requested
        organizationUser = user.organizations.find(
          org => org.organizationId === data.organizationId
        ) || null;

        if (!organizationUser) {
          throw new Error('User is not a member of the specified organization');
        }
      } else if (user.organizations.length === 1) {
        // Single organization - use it
        organizationUser = user.organizations[0];
      } else if (user.organizations.length > 1) {
        // Multiple organizations - require selection
        throw new Error('Multiple organizations found. Please specify organizationId');
      }

      // Generate tokens
      const jwtPayload = createJWTPayload(
        user,
        organizationUser?.organizationId,
        organizationUser?.role
      );
      const tokens = generateTokenPair(jwtPayload);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Log login
      await this.logAuditEvent(
        'user.login',
        'user',
        user.id,
        user.id,
        organizationUser?.organizationId,
        { email: user.email }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          username: user.username || undefined,
        },
        organization: organizationUser ? {
          id: organizationUser.organization.id,
          name: organizationUser.organization.name,
          slug: organizationUser.organization.slug,
          role: organizationUser.role
        } : undefined,
        tokens
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // This would implement refresh token validation
      // For now, return error as refresh tokens need Redis storage
      throw new Error('Refresh token functionality not yet implemented');
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.passwordHash) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      // Log password change
      await this.logAuditEvent(
        'user.password_changed',
        'user',
        userId,
        userId,
        undefined,
        { timestamp: new Date().toISOString() }
      );

      logger.info(`Password changed for user ${userId}`);
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Get user organizations
   */
  async getUserOrganizations(userId: string): Promise<Array<{
    organization: Organization;
    role: Role;
    joinedAt: Date;
  }>> {
    try {
      const organizations = await prisma.organizationUser.findMany({
        where: { userId },
        include: {
          organization: true
        },
        orderBy: {
          joinedAt: 'desc'
        }
      });

      return organizations.map(org => ({
        organization: org.organization,
        role: org.role,
        joinedAt: org.joinedAt
      }));
    } catch (error) {
      logger.error('Get user organizations error:', error);
      throw error;
    }
  }

  /**
   * Switch organization context
   */
  async switchOrganization(userId: string, organizationId: string): Promise<TokenPair> {
    try {
      // Verify user is member of organization
      const organizationUser = await prisma.organizationUser.findFirst({
        where: {
          userId,
          organizationId
        },
        include: {
          user: true,
          organization: true
        }
      });

      if (!organizationUser) {
        throw new Error('User is not a member of this organization');
      }

      // Generate new tokens with organization context
      const jwtPayload = createJWTPayload(
        organizationUser.user,
        organizationId,
        organizationUser.role
      );
      const tokens = generateTokenPair(jwtPayload);

      // Log organization switch
      await this.logAuditEvent(
        'user.organization_switch',
        'user',
        userId,
        userId,
        organizationId,
        { organizationName: organizationUser.organization.name }
      );

      return tokens;
    } catch (error) {
      logger.error('Switch organization error:', error);
      throw error;
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    action: string,
    resource: string,
    resourceId: string,
    userId: string,
    organizationId?: string,
    details?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          resource,
          resourceId,
          userId,
          organizationId,
          details,
          metadata: {
            userAgent: 'api-server',
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Audit log error:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }
}

export const authService = new AuthService();