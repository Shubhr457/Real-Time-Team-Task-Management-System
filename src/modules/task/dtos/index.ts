import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEnum, IsDate, Matches, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TaskPriority, TaskStatus } from '../../../interfaces/task.interface';

// Create Task DTO Class
export class CreateTaskDto {
  @IsString({ message: 'Task title must be a string' })
  @IsNotEmpty({ message: 'Task title is required' })
  @MinLength(3, { message: 'Task title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Task title cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  title!: string;

  @IsOptional()
  @ValidateIf((o) => o.description !== null && o.description !== '')
  @IsString({ message: 'Description must be a string' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority, { message: `Priority must be one of: ${Object.values(TaskPriority).join(', ')}` })
  priority: TaskPriority = TaskPriority.MEDIUM;

  @IsOptional()
  @IsEnum(TaskStatus, { message: `Status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  status?: TaskStatus = TaskStatus.TODO;

  @IsOptional()
  @ValidateIf((o) => o.dueDate !== null)
  @Type(() => Date)
  @IsDate({ message: 'Due date must be a valid date' })
  dueDate?: Date;

  @IsOptional()
  @ValidateIf((o) => o.assignee !== null)
  @IsString({ message: 'Assignee must be a valid user ID' })
  @Matches(/^[0-9a-fA-F]{24}$/, { message: 'Assignee must be a valid MongoDB ObjectId' })
  assignee?: string;

  @IsString({ message: 'Project ID must be a string' })
  @IsNotEmpty({ message: 'Project ID is required' })
  @Matches(/^[0-9a-fA-F]{24}$/, { message: 'Project ID must be a valid MongoDB ObjectId' })
  projectId!: string;
}

// Update Task DTO Class
export class UpdateTaskDto {
  @IsOptional()
  @IsString({ message: 'Task title must be a string' })
  @MinLength(3, { message: 'Task title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Task title cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsOptional()
  @ValidateIf((o) => o.description !== null && o.description !== '')
  @IsString({ message: 'Description must be a string' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority, { message: `Priority must be one of: ${Object.values(TaskPriority).join(', ')}` })
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus, { message: `Status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  status?: TaskStatus;

  @IsOptional()
  @ValidateIf((o) => o.dueDate !== null)
  @Type(() => Date)
  @IsDate({ message: 'Due date must be a valid date' })
  dueDate?: Date;

  @IsOptional()
  @ValidateIf((o) => o.assignee !== null)
  @IsString({ message: 'Assignee must be a valid user ID' })
  @Matches(/^[0-9a-fA-F]{24}$/, { message: 'Assignee must be a valid MongoDB ObjectId' })
  assignee?: string;
}

// Update Task Status DTO Class
export class UpdateTaskStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(TaskStatus, { message: `Status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  status!: TaskStatus;
}

