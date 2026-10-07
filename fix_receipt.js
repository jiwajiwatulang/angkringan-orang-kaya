const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace('isRevision: editingOrderId !== null', 'isRevision: isRevision');
c = c.replace('items: cart,', 'items: finalItems,');
c = c.replace('total: totalPrice,', 'total: payload.total,');

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
