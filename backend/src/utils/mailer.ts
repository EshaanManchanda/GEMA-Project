import { AppError } from "../middleware/error";
import { emailService } from "../services/email.service";
import logger from "../config/logger";

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
  venueType?: string;
  eventType?: string;
  meetingLink?: string;
  meetingPassword?: string;
}

const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await emailService.sendEmail({
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  } catch (error: any) {
    logger.error("Error sending email:", error);
    throw new AppError(`Error sending email: ${error.message}`, 500);
  }
};

export const sendTicketByEmail = async (
  ticketData: TicketEmailData,
): Promise<void> => {
  try {
    await emailService.sendTicketsEmail({
      to: ticketData.to,
      firstName: ticketData.firstName,
      tickets: [
        {
          eventTitle: ticketData.eventTitle,
          qrCode: ticketData.qrCode,
          ticketNumber: ticketData.ticketNumber,
          eventDate: ticketData.eventDate,
          venue: ticketData.venue,
          venueType: ticketData.venueType,
          eventType: ticketData.eventType,
          meetingLink: ticketData.meetingLink,
          meetingPassword: ticketData.meetingPassword,
        },
      ],
    });
  } catch (error) {
    logger.error("Error sending ticket by email:", error);
    throw new AppError("Failed to send ticket by email", 500);
  }
};

export default sendEmail;
