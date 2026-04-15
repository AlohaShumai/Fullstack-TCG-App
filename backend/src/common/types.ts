// Use `import type { AuthRequest }` in controllers to satisfy
// isolatedModules + emitDecoratorMetadata constraints.
export interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}
