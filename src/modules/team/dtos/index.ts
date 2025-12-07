import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEnum, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { TeamMemberRole } from '../../../interfaces/team.interface';

// Create Team DTO Class
export class CreateTeamDto {
  @IsString({ message: 'Team name must be a string' })
  @IsNotEmpty({ message: 'Team name is required' })
  @MinLength(2, { message: 'Team name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Team name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;
}

// Update Team DTO Class
export class UpdateTeamDto {
  @IsOptional()
  @ValidateIf((o) => o.name !== null)
  @IsString({ message: 'Team name must be a string' })
  @MinLength(2, { message: 'Team name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Team name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.description !== null && o.description !== '')
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;
}

// Invite Member DTO Class
export class InviteMemberDto {
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsOptional()
  @IsEnum(TeamMemberRole, { message: 'Role must be either admin or member' })
  role?: TeamMemberRole = TeamMemberRole.MEMBER;
}

// Update Member Role DTO Class
export class UpdateMemberRoleDto {
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(TeamMemberRole, { message: 'Role must be either admin or member' })
  role!: TeamMemberRole;
}

