const fs = require('fs');
let c = fs.readFileSync('src/app/layout.tsx', 'utf8');

if (!c.includes('export const viewport')) {
    c = c.replace(/export const metadata: Metadata = \{/, `import type { Viewport } from "next";\n\nexport const viewport: Viewport = {\n  width: "device-width",\n  initialScale: 1,\n  maximumScale: 1,\n  userScalable: false,\n  viewportFit: "cover",\n};\n\nexport const metadata: Metadata = {`);
    fs.writeFileSync('src/app/layout.tsx', c, 'utf8');
}
