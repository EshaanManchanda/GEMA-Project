import { archiveExpiredEvents } from '../utils/eventLifecycle';
import { connectDB, logger } from '../config';

async function runManualExpiration() {
  try {
    console.log('🚀 Starting manual event expiration check...');

    // Connect to database
    await connectDB();

    // Run expiration check
    const result = await archiveExpiredEvents();

    console.log('✅ Manual expiration completed:', result);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error running manual expiration:', error);
    logger.error('Manual expiration failed:', error);
    process.exit(1);
  }
}

// Run the expiration check
runManualExpiration();