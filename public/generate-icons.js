const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  const radius = size / 6;
  ctx.fillStyle = '#3B82F6';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  // Main box (larger)
  const boxWidth = size * 0.5;
  const boxHeight = size * 0.25;
  const boxX = (size - boxWidth) / 2;
  const boxY = size * 0.25;
  
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, size / 24);
  ctx.fill();
  
  // Lines in main box
  ctx.fillStyle = '#3B82F6';
  const lineHeight = size * 0.04;
  const lineY1 = boxY + boxHeight * 0.25;
  const lineY2 = boxY + boxHeight * 0.6;
  
  ctx.fillRect(boxX + boxWidth * 0.1, lineY1, boxWidth * 0.35, lineHeight);
  ctx.fillRect(boxX + boxWidth * 0.1, lineY2, boxWidth * 0.5, lineHeight);
  
  // Small boxes below
  const smallBoxSize = size * 0.22;
  const smallBoxY = size * 0.62;
  const spacing = size * 0.05;
  
  // Left small box
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect(boxX, smallBoxY, smallBoxSize, smallBoxSize, size / 32);
  ctx.fill();
  
  // Right small box
  ctx.beginPath();
  ctx.roundRect(boxX + boxWidth - smallBoxSize, smallBoxY, smallBoxSize, smallBoxSize, size / 32);
  ctx.fill();
  
  // Lines in small boxes
  ctx.fillStyle = '#3B82F6';
  const smallLineHeight = size * 0.03;
  ctx.fillRect(boxX + smallBoxSize * 0.15, smallBoxY + smallBoxSize * 0.2, smallBoxSize * 0.6, smallLineHeight);
  ctx.fillRect(boxX + boxWidth - smallBoxSize + smallBoxSize * 0.15, smallBoxY + smallBoxSize * 0.2, smallBoxSize * 0.5, smallLineHeight);
  
  return canvas;
}

// Generate icons
const icon192 = createIcon(192);
const icon512 = createIcon(512);

fs.writeFileSync('icon-192.png', icon192.toBuffer('image/png'));
fs.writeFileSync('icon-512.png', icon512.toBuffer('image/png'));

console.log('Icons generated successfully!');
