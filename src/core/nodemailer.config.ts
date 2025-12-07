import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../environments';

let transporter: Transporter | null = null;

/**
 * Creates and returns a nodemailer transporter instance
 */
export const createTransporter = (): Transporter => {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  return transporter;
};

/**
 * Verifies the email transporter connection
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const emailTransporter = createTransporter();
    await emailTransporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service verification failed:', error);
    return false;
  }
};

/**
 * Gets the transporter instance
 */
export const getTransporter = (): Transporter => {
  if (!transporter) {
    return createTransporter();
  }
  return transporter;
};

