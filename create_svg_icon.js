const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'public/Assets/BlueVolt.png');
const base64 = fs.readFileSync(logoPath).toString('base64');

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <circle cx="256" cy="256" r="256" fill="#050510" />
  <circle cx="256" cy="256" r="250" fill="none" stroke="rgba(167, 139, 250, 0.5)" stroke-width="4" />
  <!-- A perfectly clear rounded favicon -->
  <image href="data:image/png;base64,${base64}" x="128" y="128" width="256" height="256" />
</svg>`;

fs.writeFileSync(path.join(__dirname, 'src/app/icon.svg'), svg);
console.log('Successfully created scalable SVG favicon!');
