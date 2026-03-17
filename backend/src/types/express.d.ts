declare global {
  namespace Express {
    interface Request {
      user?: {
        _id?: string | undefined;
        id?: string | undefined;
        email?: string | undefined;
        role?: string | undefined;
        roleId?: string | any;
        roleName?: string;
        [key: string]: any;
      } | null;
      isAuthenticated?: boolean;
      sessionId?: string;
    }
  }
}

export {};
