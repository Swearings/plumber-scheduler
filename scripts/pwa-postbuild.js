// Injects PWA tags into the Expo-generated dist/index.html.
// Expo's web export does not add a manifest link or Apple meta tags, so we
// patch them in after `expo export -p web`. Idempotent — safe to run twice.

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found — run `expo export -p web` first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Enable safe-area insets on iOS web (env(safe-area-inset-*) needs viewport-fit=cover).
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />'
);

const tags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="PlumberPro" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <style>
      html, body, #root { background-color: #0f172a; }
      /* Fill the full screen incl. bottom safe area in standalone PWA mode,
         so the tab bar reaches the true bottom edge instead of floating. */
      html, body { height: 100%; margin: 0; }
      #root { min-height: 100dvh; }
    </style>
`;

if (html.includes('rel="manifest"')) {
  console.log('PWA tags already present — nothing to do.');
} else {
  html = html.replace('</head>', `${tags}  </head>`);
  fs.writeFileSync(indexPath, html);
  console.log('Injected PWA tags into dist/index.html');
}
