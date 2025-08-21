import cron from 'node-cron';
import { Ticket, Event } from '../models';

// Function to expire tickets for past events
export const expireOldTickets = async () => {
  try {
    console.log('Running ticket expiration job...');
    
    const now = new Date();
    
    // Find all active tickets for events that have ended
    const activeTickets = await Ticket.find({ status: 'active' })
      .populate('eventId', 'dateSchedule title');
    
    let expiredCount = 0;
    
    for (const ticket of activeTickets) {
      const event = ticket.eventId as any;
      
      if (event && event.dateSchedule && event.dateSchedule.length > 0) {
        // Get the last scheduled date for the event
        const lastEventDate = new Date(event.dateSchedule[event.dateSchedule.length - 1].date);
        
        // Add 24 hours buffer after the last event date
        const expirationDate = new Date(lastEventDate.getTime() + 24 * 60 * 60 * 1000);
        
        if (now > expirationDate) {
          // Expire the ticket
          ticket.status = 'expired';
          await ticket.save();
          expiredCount++;
          
          console.log(`Expired ticket ${ticket.ticketNumber} for event ${event.title}`);
        }
      }
    }
    
    console.log(`Ticket expiration job completed. Expired ${expiredCount} tickets.`);
    
  } catch (error) {
    console.error('Error in ticket expiration job:', error);
  }
};

// Function to delete QR codes for expired tickets (for security)
export const cleanupExpiredQRCodes = async () => {
  try {
    console.log('Running QR code cleanup job...');
    
    const expiredTickets = await Ticket.find({ 
      status: 'expired',
      qrCode: { $exists: true, $ne: null }
    });
    
    let cleanedCount = 0;
    
    for (const ticket of expiredTickets) {
      // Clear QR code data but keep the ticket record
      ticket.qrCode = '';
      ticket.qrCodeImage = '';
      await ticket.save();
      cleanedCount++;
      
      console.log(`Cleaned QR code for expired ticket ${ticket.ticketNumber}`);
    }
    
    console.log(`QR code cleanup job completed. Cleaned ${cleanedCount} QR codes.`);
    
  } catch (error) {
    console.error('Error in QR code cleanup job:', error);
  }
};

// Schedule jobs to run periodically
export const scheduleTicketJobs = () => {
  // Run ticket expiration job every hour
  cron.schedule('0 * * * *', expireOldTickets);
  
  // Run QR code cleanup job daily at 2 AM
  cron.schedule('0 2 * * *', cleanupExpiredQRCodes);
  
  console.log('Ticket management jobs scheduled successfully');
};

// Manual functions that can be called via API
export const manualExpireTickets = expireOldTickets;
export const manualCleanupQRCodes = cleanupExpiredQRCodes;