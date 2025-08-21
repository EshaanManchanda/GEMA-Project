import nodemailer from 'nodemailer';
import { config } from '../config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface VerificationEmailOptions {
  to: string;
  firstName: string;
  otp: string;
}

export interface PasswordResetEmailOptions {
  to: string;
  firstName: string;
  resetToken: string;
}

export interface OrderConfirmationEmailOptions {
  to: string;
  firstName: string;
  orderNumber: string;
  orderTotal: number;
  currency: string;
  items: Array<{
    eventTitle: string;
    quantity: number;
    price: number;
    date: Date;
  }>;
}

export interface TicketEmailOptions {
  to: string;
  firstName: string;
  tickets: Array<{
    eventTitle: string;
    qrCode: string;
    ticketNumber: string;
    eventDate: Date;
    venue: string;
  }>;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.username,
        pass: config.email.password,
      },
    });
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: config.email.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to: ${mailOptions.to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send email verification OTP
   */
  async sendVerificationEmail(options: VerificationEmailOptions): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Gema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code { display: inline-block; background: #007bff; color: white; padding: 20px 30px; font-size: 36px; font-weight: bold; letter-spacing: 12px; border-radius: 8px; margin: 20px 0; font-family: 'Courier New', monospace; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Gema!</h1>
          </div>
          <div class="content">
            <h2>Hi ${options.firstName}!</h2>
            <p>Thank you for registering with Gema, your premier event management platform.</p>
            <p>To complete your registration and start discovering amazing events, please verify your email address using the OTP code below:</p>
            <div style="text-align: center;">
              <div class="otp-code">${options.otp}</div>
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This OTP will expire in 10 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>Enter this code exactly as shown above</li>
              </ul>
            </div>
            <p>If you didn't create an account with Gema, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Gema Team</p>
            <p><small>This is an automated email. Please do not reply to this message.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hi ${options.firstName}!
      
      Thank you for registering with Gema. To complete your registration, please verify your email address using the OTP code below:
      
      OTP Code: ${options.otp}
      
      This OTP will expire in 10 minutes. Do not share this code with anyone.
      
      If you didn't create an account with Gema, please ignore this email.
      
      Best regards,
      The Gema Team
    `;

    await this.sendEmail({
      to: options.to,
      subject: 'Email Verification OTP - Gema',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${options.resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Gema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${options.firstName}!</h2>
            <p>We received a request to reset the password for your Gema account.</p>
            <p>If you made this request, click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn">Reset My Password</a>
            </div>
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This password reset link will expire in 1 hour</li>
                <li>For security reasons, this link can only be used once</li>
                <li>If you didn't request this password reset, please ignore this email</li>
              </ul>
            </div>
            <p>If you continue to have problems or didn't request this reset, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Gema Team</p>
            <p><small>This is an automated email. Please do not reply to this message.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hi ${options.firstName}!
      
      We received a request to reset the password for your Gema account.
      
      If you made this request, visit this link to reset your password:
      ${resetUrl}
      
      This password reset link will expire in 1 hour and can only be used once.
      
      If you didn't request this password reset, please ignore this email.
      
      Best regards,
      The Gema Team
    `;

    await this.sendEmail({
      to: options.to,
      subject: 'Reset Your Password - Gema',
      html,
      text,
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(options: OrderConfirmationEmailOptions): Promise<void> {
    const itemsHtml = options.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.eventTitle}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${options.currency} ${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.date.toLocaleDateString()}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Gema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .total { background: #28a745; color: white; padding: 15px; text-align: center; border-radius: 5px; font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Order Confirmed!</h1>
          </div>
          <div class="content">
            <h2>Hi ${options.firstName}!</h2>
            <p>Thank you for your order! We're excited to confirm that your booking has been successfully processed.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${options.orderNumber}</p>
              
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: center;">Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div class="total">
                Total: ${options.currency} ${options.orderTotal.toFixed(2)}
              </div>
            </div>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Your tickets will be sent to you in a separate email shortly</li>
              <li>Each ticket contains a unique QR code for entry</li>
              <li>Please arrive 15 minutes before the event start time</li>
              <li>Bring a valid ID that matches the booking name</li>
            </ul>
            
            <p>If you have any questions about your order, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Gema Team</p>
            <p><small>Order confirmation #${options.orderNumber}</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: options.to,
      subject: `Order Confirmation - ${options.orderNumber}`,
      html,
    });
  }

  /**
   * Send tickets email
   */
  async sendTicketsEmail(options: TicketEmailOptions): Promise<void> {
    const ticketsHtml = options.tickets.map(ticket => `
      <div style="border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 15px 0; background: white;">
        <h3 style="margin-top: 0; color: #007bff;">${ticket.eventTitle}</h3>
        <p><strong>Ticket #:</strong> ${ticket.ticketNumber}</p>
        <p><strong>Date:</strong> ${ticket.eventDate.toLocaleDateString()}</p>
        <p><strong>Venue:</strong> ${ticket.venue}</p>
        <div style="text-align: center; margin: 15px 0;">
          <img src="${ticket.qrCode}" alt="QR Code" style="max-width: 150px; height: auto;">
        </div>
        <p style="font-size: 12px; color: #666; text-align: center;">
          Show this QR code at the venue entrance
        </p>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Tickets - Gema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .important { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Your Tickets Are Ready!</h1>
          </div>
          <div class="content">
            <h2>Hi ${options.firstName}!</h2>
            <p>Your tickets are ready! Please find your digital tickets below.</p>
            
            ${ticketsHtml}
            
            <div class="important">
              <h3>📋 Important Information:</h3>
              <ul>
                <li><strong>Save these tickets:</strong> Screenshot or save this email for offline access</li>
                <li><strong>Arrive early:</strong> Come 15 minutes before the event starts</li>
                <li><strong>Bring ID:</strong> Valid identification matching the booking name</li>
                <li><strong>QR Code:</strong> Keep your QR code visible and unobstructed</li>
                <li><strong>Transfers:</strong> Contact us if you need to transfer tickets</li>
              </ul>
            </div>
            
            <p>We hope you have an amazing time at your events! If you need any assistance, our support team is here to help.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Gema Team</p>
            <p><small>Keep this email safe - it contains your entry tickets!</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: options.to,
      subject: 'Your Event Tickets - Gema',
      html,
    });
  }

  /**
   * Send admin notification email
   */
  async sendAdminNotification(subject: string, message: string, data?: any): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Admin Notification - Gema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { background: #f8f9fa; padding: 20px; }
          .data { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Admin Notification</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <p>${message}</p>
            ${data ? `
              <div class="data">
                <h3>Additional Data:</h3>
                <pre>${JSON.stringify(data, null, 2)}</pre>
              </div>
            ` : ''}
            <p><small>Timestamp: ${new Date().toISOString()}</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // In a real application, you would have admin email addresses configured
    // For now, we'll use a placeholder
    const adminEmail = 'admin@gema.com';

    await this.sendEmail({
      to: adminEmail,
      subject: `[ADMIN] ${subject}`,
      html,
    });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connected successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;