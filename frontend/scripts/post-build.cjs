const fs = require('fs');
const path = require('path');

/**
 * Recursively calculate directory size
 */
function getDirectorySize(dirPath) {
  let totalSize = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      totalSize += getDirectorySize(filePath);
    } else {
      try {
        totalSize += fs.statSync(filePath).size;
      } catch (err) {
        console.warn(`Warning: Could not stat ${filePath}`);
      }
    }
  }

  return totalSize;
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Count files in directory with filter
 */
function countFiles(dirPath, extension) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  return fs.readdirSync(dirPath).filter(f => f.endsWith(extension) && !f.endsWith('.map')).length;
}

/**
 * Main build verification
 */
function verifyBuild() {
  console.log('');
  console.log('🔍 Verifying build output...');
  console.log('');

  // Check if build succeeded
  if (!fs.existsSync('dist/index.html')) {
    console.error('❌ Build failed - index.html not found');
    console.error('   The build did not complete successfully.');
    process.exit(1);
  }

  // Calculate sizes
  const distSize = getDirectorySize('dist');
  const jsSize = getDirectorySize('dist/js');
  const cssSize = getDirectorySize('dist/css');
  const imagesSize = getDirectorySize('dist/images');

  // Get file counts
  const jsFiles = countFiles('dist/js', '.js');
  const cssFiles = countFiles('dist/css', '.css');
  const sourcemapFiles = fs.existsSync('dist/js')
    ? fs.readdirSync('dist/js').filter(f => f.endsWith('.map')).length
    : 0;

  // Calculate approximate production size (without sourcemaps)
  const sourcemapsSize = getDirectorySize('dist/js') - jsSize; // Rough estimate
  const productionSize = distSize - (sourcemapsSize * 0.5); // Sourcemaps are ~50% of JS size

  console.log('✅ Build successful!');
  console.log('');
  console.log('📦 Build Summary:');
  console.log('   ─────────────────────────────────────');
  console.log(`   Total size:        ${formatBytes(distSize)}`);

  if (process.env.NODE_ENV === 'production') {
    console.log(`   Production size:   ${formatBytes(productionSize)} (no sourcemaps)`);
  }

  console.log('');
  console.log('   Asset Breakdown:');
  console.log(`   • JavaScript:      ${formatBytes(jsSize)} (${jsFiles} files)`);
  console.log(`   • CSS:             ${formatBytes(cssSize)} (${cssFiles} files)`);

  if (imagesSize > 0) {
    console.log(`   • Images:          ${formatBytes(imagesSize)}`);
  }

  if (sourcemapFiles > 0) {
    console.log(`   • Sourcemaps:      ${sourcemapFiles} files`);
  }

  console.log('   ─────────────────────────────────────');
  console.log('');

  // Size warnings
  const jsOnlySize = jsSize / 2; // Approximate without sourcemaps
  const SIZE_LIMIT_MB = 5;
  const SIZE_WARNING_MB = 3;

  if (jsOnlySize > SIZE_LIMIT_MB * 1024 * 1024) {
    console.warn(`⚠️  Warning: JS bundle is larger than ${SIZE_LIMIT_MB}MB`);
    console.warn('   Consider these optimizations:');
    console.warn('   • Enable code splitting');
    console.warn('   • Lazy load routes and components');
    console.warn('   • Review large dependencies');
    console.warn('');
  } else if (jsOnlySize > SIZE_WARNING_MB * 1024 * 1024) {
    console.log(`💡 Tip: JS bundle is approaching ${SIZE_WARNING_MB}MB`);
    console.log('   Consider lazy loading non-critical routes');
    console.log('');
  }

  // Success message
  console.log('✨ Build ready for deployment!');

  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Optimized for production (console logs removed)');
  } else {
    console.log('🔧 Development build (includes sourcemaps)');
  }

  console.log('');
}

// Run verification
try {
  verifyBuild();
} catch (error) {
  console.error('❌ Build verification failed:', error.message);
  process.exit(1);
}