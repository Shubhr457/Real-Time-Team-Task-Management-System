import mongoose, { Schema, Model } from 'mongoose';
import { ITask, TaskPriority, TaskStatus } from '../interfaces/task.interface';

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Task title must be at least 3 characters long'],
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      required: [true, 'Task priority is required'],
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
      required: [true, 'Task status is required'],
    },
    dueDate: {
      type: Date,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    projectId: {
      type: String,
      ref: 'Project',
      required: [true, 'Project ID is required'],
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        const transformed: any = { ...ret };
        transformed.id = transformed._id;
        delete transformed._id;
        delete transformed.__v;
        return transformed;
      },
    },
  }
);

// Indexes for faster queries
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });

// Method to check if task can transition to new status
taskSchema.methods.canTransitionTo = function (newStatus: TaskStatus): boolean {
  const transitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.DONE],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.REVIEW, TaskStatus.DONE],
    [TaskStatus.REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.DONE],
    [TaskStatus.DONE]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW],
  };

  const currentStatus = this.status as TaskStatus;
  return transitions[currentStatus]?.includes(newStatus) || false;
};

const Task: Model<ITask> = mongoose.model<ITask>('Task', taskSchema);

export default Task;

