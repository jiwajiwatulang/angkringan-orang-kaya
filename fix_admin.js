const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
code = code.replace(/<Link href="\/" className="text-sm text-gray-500 hover:text-gray-700">.*?Kembali ke Kasir<\/Link>/, '<Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Kembali ke Kasir</Link>');
fs.writeFileSync('src/app/admin/page.tsx', code, 'utf8');
console.log('Fixed admin typo');
