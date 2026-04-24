import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

// PATCH /users/me — update the logged-in user's display name
// Regex enforces alphanumeric + underscores only (no spaces, special chars, or profanity escapes)
export class UpdateUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;
}

// PATCH /users/me/password — requires the current password to prevent account takeover
// if the user's session is compromised but they haven't changed the password yet
export class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
