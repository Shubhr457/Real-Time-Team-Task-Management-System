import { Application } from 'express';
import authRoutes from './modules/admin/auth/routes';
import teamRoutes from './modules/team/routes';
import projectRoutes from './modules/project/routes';
import taskRoutes from './modules/task/routes';
import activityRoutes from './modules/activity/routes';

/**
 * Configure all application routes
 */
export const configureRoutes = (app: Application): void => {
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     description: Check if the server is running and healthy
   *     tags: [Health]
   *     security: []
   *     responses:
   *       200:
   *         description: Server is running
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Server is running
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/activities', activityRoutes);
};
