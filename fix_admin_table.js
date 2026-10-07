const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Add states
c = c.replace('const [selectedOrders, setSelectedOrders] = useState<number[]>([]);', 
`const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);`);

// 2. Modify filteredOrders
c = c.replace(/const filteredOrders = orders\.filter\(order => \{/, 
`const filteredOrders = orders.filter(order => {
    let isValid = true;
    if (orderSearchQuery) {
      const q = orderSearchQuery.toLowerCase();
      const match = (order.id && String(order.id).includes(q)) || 
                    (order.customerName && order.customerName.toLowerCase().includes(q)) || 
                    (order.notes && order.notes.toLowerCase().includes(q));
      if (!match) isValid = false;
    }
`);

// 3. Add pagination variables after filteredOrders
const filteredOrdersEnd = c.indexOf('// Filter by Payment Method') + 300; 
// Let's just find the end of filteredOrders
c = c.replace(/return isValid;\n\s*\});/, 
`return isValid;
  });
  
  const totalOrderPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrderData = filteredOrders.slice((orderCurrentPage - 1) * itemsPerPage, orderCurrentPage * itemsPerPage);
`);

// 4. Update Header Table
c = c.replace(/<th className="py-3 px-4 text-gray-600 font-medium text-sm">Tipe Order<\/th>/, 
`<th className="py-3 px-4 text-gray-600 font-medium text-sm">Tipe Order</th>
<th className="py-3 px-4 text-gray-600 font-medium text-sm">Meja</th>`);

// 5. Update tbody mapping and add td
c = c.replace(/\{filteredOrders\.map\(\(order: any, index: number\) => \(/, 
`{currentOrderData.map((order: any, index: number) => (`);

c = c.replace(/<td className="py-3 px-4 text-gray-800 font-medium">\s*<span[^>]*>\s*\{order\.orderType \|\| 'Dine-in'\}\s*<\/span>\s*<\/td>/g, 
`<td className="py-3 px-4 text-gray-800 font-medium">
  <span className={\`px-2 py-1 rounded text-xs \${order.orderType === 'Takeaway' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}\`}>
    {order.orderType || 'Dine-in'}
  </span>
</td>
<td className="py-3 px-4 text-gray-600 text-sm font-medium">
  {order.orderType === 'Dine-in' && order.tableId ? (tables.find(t => t.id === order.tableId)?.nomor || '-') : '-'}
</td>`);

// 6. Add Search Input above table
c = c.replace(/<div className="flex justify-between items-center mb-4 mt-6">/, 
`<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 mt-6 gap-4">
    <div className="flex items-center gap-4 w-full md:w-auto">
      <h3 className="text-lg font-medium text-gray-700 whitespace-nowrap">Daftar Nota</h3>
      <input 
        type="text" 
        placeholder="Cari No Nota, Nama..." 
        value={orderSearchQuery}
        onChange={(e) => { setOrderSearchQuery(e.target.value); setOrderCurrentPage(1); }}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-full md:w-64 focus:border-green-500 outline-none"
      />
    </div>`);

// 7. Add Pagination UI below table
c = c.replace(/<\/table>\s*<\/div>\s*<\/div>\s*\{\/\* Settings Tab \*\/\}/, 
`</table>
</div>
{totalOrderPages > 1 && (
  <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl border border-gray-200">
    <span className="text-sm text-gray-600">
      Menampilkan {((orderCurrentPage - 1) * itemsPerPage) + 1} - {Math.min(orderCurrentPage * itemsPerPage, filteredOrders.length)} dari {filteredOrders.length} nota
    </span>
    <div className="flex space-x-2">
      <button 
        onClick={() => setOrderCurrentPage(prev => Math.max(1, prev - 1))}
        disabled={orderCurrentPage === 1}
        className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
      >
        Prev
      </button>
      <span className="px-4 py-1 text-gray-800 font-medium">{orderCurrentPage} / {totalOrderPages}</span>
      <button 
        onClick={() => setOrderCurrentPage(prev => Math.min(totalOrderPages, prev + 1))}
        disabled={orderCurrentPage === totalOrderPages}
        className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
      >
        Next
      </button>
    </div>
  </div>
)}
</div>
{/* Settings Tab */}`);

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
