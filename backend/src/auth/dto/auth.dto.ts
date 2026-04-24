import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

// DTOs (Data Transfer Objects) define the shape of request bodies.
// The class-validator decorators are enforced automatically by the global ValidationPipe in main.ts.

export class RegisterDto {
  @IsEmail()
  email: string;

  // Letters, numbers, underscores only — enforced both here and in UsersService
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
