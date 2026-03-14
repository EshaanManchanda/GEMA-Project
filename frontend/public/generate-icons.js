// Simple script to create basic PWA icon placeholders
// These are simple colored squares that can be replaced with proper icons later

const fs = require('fs');
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Simple SVG icon template
const createSVGIcon = (size, color = '#3B82F6') => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="8"/>
  <text x="50%" y="50%" fill="white" font-family="Arial" font-size="${size * 0.3}" font-weight="bold" text-anchor="middle" dy="0.35em">G</text>
</svg>
`;

// Create icon files
iconSizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.png`;
  
  // For now, just create SVG files that browsers can use as fallbacks
  fs.writeFileSync(`icon-${size}x${size}.svg`, svgContent);
  console.log(`Created ${filename} (as SVG)`);
});

// Create apple-touch-icon
fs.writeFileSync('apple-touch-icon.png', createSVGIcon(180));
console.log('Created apple-touch-icon.png (as SVG)');

// Create a basic browserconfig.xml
const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="/icon-144x144.png"/>
            <TileColor>#3B82F6</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;

fs.writeFileSync('browserconfig.xml', browserConfig);
console.log('Created browserconfig.xml');

console.log('\nNote: Icon files created as SVG placeholders. Replace with proper PNG icons in production.');