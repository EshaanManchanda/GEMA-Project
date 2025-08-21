import nodemailer from 'nodemailer';
import { AppError } from '../middleware/error';
import { emailService } from '../services/email.service';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface TicketEmailData {
  to: string;
  firstName: string;
  eventTitle: string;
  ticketNumber: string;
  qrCode: string;
  eventDate: Date;
  venue: string;
}

const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.NODE_ENV === 'production',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to}`);
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw new AppError(`Error sending email: ${error.message}`, 500);
  }
};

export const sendTicketByEmail = async (ticketData: TicketEmailData): Promise<void> => {
  try {
    await emailService.sendTicketsEmail({
      to: ticketData.to,
      firstName: ticketData.firstName,
      tickets: [{
        eventTitle: ticketData.eventTitle,
        qrCode: ticketData.qrCode,
        ticketNumber: ticketData.ticketNumber,
        eventDate: ticketData.eventDate,
        venue: ticketData.venue,
      }]
    });
  } catch (error) {
    console.error('Error sending ticket by email:', error);
    throw new AppError('Failed to send ticket by email', 500);
  }
};

export default sendEmail;