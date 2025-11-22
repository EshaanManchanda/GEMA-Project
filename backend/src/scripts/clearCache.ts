import { cacheService } from '../services/cache.service';
import { redisClient } from '../config/redis';

async function clearCache() {
  try {
    console.log('='.repeat(80));
    console.log('CACHE CLEARING SCRIPT');
    console.log('='.repeat(80));
    console.log();

    // Wait for Redis to be ready
    console.log('Waiting for Redis connection...');
    let attempts = 0;
    while (redisClient?.status !== 'ready' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (redisClient?.status !== 'ready') {
      console.log('❌ Redis is not available');
      process.exit(1);
    }

    console.log('✓ Redis is ready\n');

    // Get stats before clearing
    const statsBefore = await cacheService.getStats();
    console.log('CACHE STATS BEFORE:');
    console.log(`  Keys in cache: ${statsBefore.dbSize}`);
    console.log(`  Connected: ${statsBefore.connected}\n`);

    // Clear all cache
    console.log('Clearing all cache...');
    const result = await cacheService.flushAll();

    if (result) {
      console.log('✓ Cache cleared successfully\n');
    } else {
      console.log('❌ Failed to clear cache\n');
    }

    // Get stats after clearing
    const statsAfter = await cacheService.getStats();
    console.log('CACHE STATS AFTER:');
    console.log(`  Keys in cache: ${statsAfter.dbSize}`);
    console.log(`  Connected: ${statsAfter.connected}\n`);

    console.log('='.repeat(80));
    console.log('CACHE CLEARING COMPLETE');
    console.log('='.repeat(80));

    // Close Redis connection
    if (redisClient) {
      await redisClient.quit();
    }

  } catch (error) {
    console.error('Error clearing cache:', error);
    if (redisClient) {
      await redisClient.quit();
    }
    process.exit(1);
  }
}

// Run the script
clearCache();
