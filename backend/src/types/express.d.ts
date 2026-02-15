declare global {
  interface AuthenticatedUser {
    _id: string;
    id?: string;
    email?: string;
    role?: string;
    roleId?: string;
    roleName?: string;
  }

  namespace Express {
    interface Request {
      user?: AuthenticatedUser | null;
      isAuthenticated?: boolean;
      sessionId?: string;
    }
  }
}

export {};
