const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Add state
if(!c.includes('isMobileCartOpen')) {
    c = c.replace(/const \[isDark, setIsDark\] = useState\(false\);/, `const [isDark, setIsDark] = useState(false);\n  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);`);
}

// 2. Change Cart Container
const oldCartClass = /<div className="w-full md:w-96 bg-white dark:bg-gray-800 flex flex-col border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 shadow-2xl h-\[45vh\] md:h-auto z-10 transition-colors">/;
const newCartClass = `<div className={\`bg-white dark:bg-gray-800 flex-col md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 shadow-2xl z-40 transition-colors md:flex md:static md:w-96 md:h-auto \${isMobileCartOpen ? 'fixed inset-0 h-full w-full flex' : 'hidden'}\`}>`;
c = c.replace(oldCartClass, newCartClass);

// 3. Add Close Button in Cart Header
const cartHeader = /<h2 className="text-lg font-bold text-gray-800 dark:text-white">\{editingOrderId \? 'Edit Open Bill' : 'Keranjang Pesanan'\}<\/h2>/;
const newCartHeader = `<div className="flex items-center gap-2">
                  <button onClick={() => setIsMobileCartOpen(false)} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  </button>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">{editingOrderId ? 'Edit Open Bill' : 'Keranjang Pesanan'}</h2>
                </div>`;
c = c.replace(cartHeader, newCartHeader);

// 4. Add Floating Bottom Bar
// Find where the left panel ends. The left panel contains the Menu/Meja view.
// It ends right before {/* Right Panel (Cart) */}
const floatingBar = `
          {/* Floating Cart Button (Mobile) */}
          {(!isMobileCartOpen && (cart.length > 0 || selectedTable)) && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
              <button 
                onClick={() => setIsMobileCartOpen(true)}
                className="w-full bg-blue-600 text-white rounded-xl py-3 px-4 flex justify-between items-center shadow-lg active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 px-2 py-1 rounded-lg text-sm font-bold">{cart.reduce((s, i) => s + i.qty, 0)} Item</div>
                  <span className="font-semibold">{selectedTableObj ? \`Meja \${selectedTableObj.nomor}\` : 'Tanpa Meja'}</span>
                </div>
                <div className="font-black text-lg">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </div>
              </button>
            </div>
          )}
          
          {/* Right Panel (Cart) */}
`;
c = c.replace(/\{\/\* Right Panel \(Cart\) \*\/\}/, floatingBar);

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
