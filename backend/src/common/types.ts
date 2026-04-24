// Shared type used across all authenticated controllers.
// After JwtAuthGuard runs, Passport attaches the validated user to req.user.
// Use `import type { AuthRequest }` in controllers to satisfy
// isolatedModules + emitDecoratorMetadata constraints.
export interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
    username: string;
  };
}
