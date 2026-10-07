const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/<p className="text-xs">Jl\. Contoh Alamat No\. 123<\/p>[\s\S]*?<p className="text-xs">Telp: 08123456789<\/p>/, 
'<p className="text-[10px] uppercase leading-tight mt-1">Jl. Raya Kerobokan No.5<br/>Kerobokan Kelod, Kuta Utara, Bali 80361</p>');

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
