import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

// Create Project DTO Class
export class CreateProjectDto {
  @IsString({ message: 'Project name must be a string' })
  @IsNotEmpty({ message: 'Project name is required' })
  @MinLength(2, { message: 'Project name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Project name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsString({ message: 'Team ID must be a string' })
  @IsNotEmpty({ message: 'Team ID is required' })
  @Matches(/^[0-9a-fA-F]{24}$/, { message: 'Invalid Team ID format' })
  teamId!: string;
}

// Update Project DTO Class
export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Project name must be a string' })
  @MinLength(2, { message: 'Project name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Project name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.description !== null && o.description !== '')
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;
}

