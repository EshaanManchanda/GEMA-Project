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

export interface VendorBookingNotificationOptions {
  to: string;
  vendorName: string;
  orderNumber: string;
  eventTitle: string;
  eventDate: Date;
  participantCount: number;
  orderTotal: number;
  currency: string;
  participants: Array<{
    name: string;
    email?: string;
    phone?: string;
    age?: number;
    gender?: string;
    registrationData?: Array<{
      fieldLabel: string;
      fieldType: string;
      value: any;
    }>;
  }>;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface EmployeeWelcomeEmailOptions {
  to: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  email: string;
  temporaryPassword: string;
  vendorName: string;
  role: string;
}

export interface ContactNotificationOptions {
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: Date;
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
   * Send vendor booking notification email
   */
  async sendVendorBookingNotificationEmail(options: VendorBookingNotificationOptions): Promise<void> {
    // Format participant information
    const participantsHtml = options.participants.map((participant, index) => {
      // Build registration data section if available
      let registrationDataHtml = '';
      if (participant.registrationData && participant.registrationData.length > 0) {
        const fieldRows = participant.registrationData.map(field => {
          // Format value based on type
          let displayValue = field.value;
          if (Array.isArray(field.value)) {
            displayValue = field.value.join(', ');
          } else if (field.fieldType === 'checkbox') {
            displayValue = field.value ? 'Yes' : 'No';
          } else if (field.fieldType === 'date' && field.value) {
            displayValue = new Date(field.value).toLocaleDateString();
          }

          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${field.fieldLabel}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${displayValue || 'N/A'}</td>
            </tr>
          `;
        }).join('');

        registrationDataHtml = `
          <div style="margin-top: 15px; background: #f8f9fa; padding: 15px; border-radius: 5px;">
            <h4 style="margin-top: 0; color: #495057; font-size: 14px;">Additional Registration Details</h4>
            <table style="width: 100%; font-size: 13px;">
              ${fieldRows}
            </table>
          </div>
        `;
      }

      return `
        <div style="border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 15px 0; background: white;">
          <h3 style="margin-top: 0; color: #007bff; font-size: 16px;">Participant ${index + 1}: ${participant.name}</h3>
          <table style="width: 100%; margin-top: 10px; font-size: 14px;">
            ${participant.email ? `
              <tr>
                <td style="padding: 8px; font-weight: 500; width: 30%;">Email:</td>
                <td style="padding: 8px;">${participant.email}</td>
              </tr>
            ` : ''}
            ${participant.phone ? `
              <tr>
                <td style="padding: 8px; font-weight: 500;">Phone:</td>
                <td style="padding: 8px;">${participant.phone}</td>
              </tr>
            ` : ''}
            ${participant.age ? `
              <tr>
                <td style="padding: 8px; font-weight: 500;">Age:</td>
                <td style="padding: 8px;">${participant.age}</td>
              </tr>
            ` : ''}
            ${participant.gender ? `
              <tr>
                <td style="padding: 8px; font-weight: 500;">Gender:</td>
                <td style="padding: 8px; text-transform: capitalize;">${participant.gender}</td>
              </tr>
            ` : ''}
          </table>
          ${registrationDataHtml}
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Received - Gema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .booking-summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
          .customer-info { background: #e0e7ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Booking Received!</h1>
          </div>
          <div class="content">
            <h2>Hi ${options.vendorName}!</h2>
            <p>Great news! You've received a new booking for your event.</p>

            <div class="booking-summary">
              <h3 style="margin-top: 0; color: #6366f1;">Booking Summary</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px; font-weight: 500; width: 30%;">Order Number:</td>
                  <td style="padding: 8px;"><strong>${options.orderNumber}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: 500;">Event:</td>
                  <td style="padding: 8px;">${options.eventTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: 500;">Event Date:</td>
                  <td style="padding: 8px;">${options.eventDate.toLocaleDateString()} at ${options.eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: 500;">Participants:</td>
                  <td style="padding: 8px;"><strong>${options.participantCount}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: 500;">Total Amount:</td>
                  <td style="padding: 8px;"><strong style="color: #10b981; font-size: 18px;">${options.currency} ${options.orderTotal.toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>

            <div class="customer-info">
              <h3 style="margin-top: 0; color: #4338ca; font-size: 16px;">Customer Information</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${options.customerName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${options.customerEmail}</p>
              ${options.customerPhone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${options.customerPhone}</p>` : ''}
            </div>

            <h3 style="color: #374151;">Participant Details</h3>
            ${participantsHtml}

            <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #1e40af;">
                <strong>📋 Next Steps:</strong>
              </p>
              <ul style="margin: 10px 0; padding-left: 20px; color: #1e40af;">
                <li>The customer has received their tickets with QR codes</li>
                <li>Review participant information and prepare for the event</li>
                <li>Contact participants if you need additional information</li>
                <li>Use QR code scanner at check-in for quick verification</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 25px 0;">
              <p style="color: #6b7280;">Manage this booking in your vendor dashboard</p>
            </div>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Gema Team</p>
            <p><small>Booking notification #${options.orderNumber}</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: options.to,
      subject: `New Booking Received - ${options.eventTitle} (${options.orderNumber})`,
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
   * Send employee welcome email with login credentials
   */
  async sendEmployeeWelcomeEmail(options: EmployeeWelcomeEmailOptions): Promise<void> {
    const loginUrl = `${config.frontendUrl}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to the Team - Gema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials-box { background: white; border: 2px solid #007bff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .credential-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
          .credential-row:last-child { border-bottom: none; }
          .credential-label { font-weight: bold; color: #666; }
          .credential-value { font-family: 'Courier New', monospace; color: #007bff; font-weight: bold; }
          .button { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #0056b3; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .info-box { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to the Team!</h1>
          </div>
          <div class="content">
            <h2>Hi ${options.firstName} ${options.lastName}!</h2>
            <p>Welcome to <strong>${options.vendorName}</strong>! Your employer has created an employee account for you on Gema.</p>

            <p>You have been assigned the role of <strong>${options.role.charAt(0).toUpperCase() + options.role.slice(1)}</strong>.</p>

            <div class="credentials-box">
              <h3 style="margin-top: 0; color: #007bff;">📝 Your Login Credentials</h3>
              <div class="credential-row">
                <span class="credential-label">Employee ID:</span>
                <span class="credential-value">${options.employeeId}</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Email (Username):</span>
                <span class="credential-value">${options.email}</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Temporary Password:</span>
                <span class="credential-value">${options.temporaryPassword}</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">🔐 Login to Your Dashboard</a>
            </div>

            <div class="warning">
              <strong>⚠️ Important Security Instructions:</strong>
              <ul>
                <li><strong>Change your password immediately</strong> after your first login</li>
                <li>Do not share your password with anyone, including your employer</li>
                <li>Keep this email secure or delete it after changing your password</li>
                <li>If you didn't expect this email, please contact your employer immediately</li>
              </ul>
            </div>

            <div class="info-box">
              <strong>📌 Next Steps:</strong>
              <ol style="margin: 10px 0;">
                <li>Click the login button above or visit: <a href="${loginUrl}">${loginUrl}</a></li>
                <li>Enter your email and temporary password</li>
                <li>You'll be prompted to change your password</li>
                <li>Complete your profile and start working!</li>
              </ol>
            </div>

            <p>If you have any questions or need assistance, please contact your supervisor or the Gema support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br><strong>The Gema Team</strong></p>
            <p><small>This is an automated email. Please do not reply to this message.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to the Team, ${options.firstName} ${options.lastName}!

      Welcome to ${options.vendorName}! Your employer has created an employee account for you on Gema.

      Role: ${options.role.charAt(0).toUpperCase() + options.role.slice(1)}

      YOUR LOGIN CREDENTIALS:
      =======================
      Employee ID: ${options.employeeId}
      Email (Username): ${options.email}
      Temporary Password: ${options.temporaryPassword}

      Login URL: ${loginUrl}

      IMPORTANT SECURITY INSTRUCTIONS:
      - Change your password immediately after your first login
      - Do not share your password with anyone
      - Keep this email secure or delete it after changing your password

      NEXT STEPS:
      1. Visit ${loginUrl}
      2. Enter your email and temporary password
      3. You'll be prompted to change your password
      4. Complete your profile and start working!

      If you have any questions, please contact your supervisor.

      Best regards,
      The Gema Team
    `;

    await this.sendEmail({
      to: options.to,
      subject: `Welcome to ${options.vendorName} - Your Gema Employee Account`,
      html,
      text,
    });
  }

  /**
   * Send contact form notification to support team
   */
  async sendContactNotification(options: ContactNotificationOptions): Promise<void> {
    const supportEmail = 'support@gemaevents.com';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission - Gema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: bold; color: #666; width: 120px; flex-shrink: 0; }
          .info-value { color: #333; flex: 1; word-break: break-word; }
          .message-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Form Submission</h1>
          </div>
          <div class="content">
            <p>A new contact form has been submitted on the Gema Events website.</p>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #667eea;">Contact Information</h3>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${options.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value"><a href="mailto:${options.email}">${options.email}</a></span>
              </div>
              <div class="info-row">
                <span class="info-label">Subject:</span>
                <span class="info-value">${options.subject}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Submitted:</span>
                <span class="info-value">${options.submittedAt.toLocaleString()}</span>
              </div>
            </div>

            <div class="message-box">
              <h4 style="margin-top: 0; color: #1976d2;">Message:</h4>
              <p style="white-space: pre-wrap; margin: 0;">${options.message}</p>
            </div>

            <p style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>⚠️ Action Required:</strong> Please respond to this inquiry within 24 hours.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Gema Events Contact Form</p>
            <p><small>Submitted on ${options.submittedAt.toLocaleDateString()}</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      NEW CONTACT FORM SUBMISSION

      Contact Information:
      --------------------
      Name: ${options.name}
      Email: ${options.email}
      Subject: ${options.subject}
      Submitted: ${options.submittedAt.toLocaleString()}

      Message:
      --------------------
      ${options.message}

      ACTION REQUIRED: Please respond to this inquiry within 24 hours.

      This is an automated notification from Gema Events Contact Form.
    `;

    await this.sendEmail({
      to: supportEmail,
      subject: `New Contact Form: ${options.subject} - ${options.name}`,
      html,
      text,
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