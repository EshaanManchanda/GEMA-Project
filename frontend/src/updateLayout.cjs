const fs = require('fs');
const filePath = 'd:/OLD LAPTOP/my works/GEMA-Project-backend_auth/frontend/src/pages/EventDetailPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const blockStartStr = '              {/* Reviews Section: What People Are Saying */}';
const blockStartIdx = content.indexOf(blockStartStr);
if (blockStartIdx === -1) { console.error('Start block not found'); process.exit(1); }

const blockEndStr = '                </div>\n              </div>';
let blockEndIdx = content.indexOf(blockEndStr, blockStartIdx);
if (blockEndIdx === -1) { console.error('End block not found'); process.exit(1); }
blockEndIdx += blockEndStr.length;

let reviewBlock = content.substring(blockStartIdx, blockEndIdx);
content = content.substring(0, blockStartIdx) + content.substring(blockEndIdx);

reviewBlock = reviewBlock.replace(/text-\[\#003B95\]/g, 'text-primary');
reviewBlock = reviewBlock.replace(/bg-\[\#003B95\]/g, 'bg-primary');
reviewBlock = reviewBlock.replace('if (total === 0) return "4.7";', 'if (total === 0) return "0.0";');
reviewBlock = reviewBlock.replace('return total === 0 ? "5,515 reviews" : `${total.toLocaleString()} reviews`;', 'return `${total.toLocaleString()} reviews`;');

const oldIfTotal0 = `                        if (total === 0) {
                          if (star === 5) pct = 79.26;
                          if (star === 4) pct = 16.22;
                          if (star === 3) pct = 2.48;
                          if (star === 2) pct = 0.68;
                          if (star === 1) pct = 1.34;
                        }`;
const newIfTotal0 = `                        if (total === 0) {
                          pct = 0;
                        }`;
reviewBlock = reviewBlock.replace(oldIfTotal0, newIfTotal0);

const gridEndRegex = /          <\/div>\n        <\/div>(\s+)(?:{\/\* Sticky bottom CTA bar — mobile only \*\/})/;
if (!gridEndRegex.test(content)) {
    console.error('Could not find grid end!');
    process.exit(1);
}

content = content.replace(gridEndRegex, (match, whitespace) => {
   return '          </div>\n        </div>\n\n' + reviewBlock + whitespace + '{/* Sticky bottom CTA bar — mobile only */}';
});

fs.writeFileSync(filePath, content);
console.log('Update Complete!');
