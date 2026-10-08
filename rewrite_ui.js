const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

// Find the start of floating bar
const floatingBarStart = c.indexOf('{/* Floating Cart Button (Mobile) */}');
// Find the end of the return statement
const returnEnd = c.lastIndexOf('</>');

if(floatingBarStart === -1 || returnEnd === -1) {
   console.log("Could not find delimiters");
   process.exit(1);
}

const beforeFloatingBar = c.substring(0, floatingBarStart);
const afterReturn = c.substring(returnEnd);

const cartInnerFunc = `
  const renderCartInner = (isMobile: boolean) => (
    <>
      <div className={\`\${isMobile ? 'px-6 pb-4 pt-2' : 'p-5'} border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-3xl\`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{editingOrderId ? 'Edit Open Bill' : 'Pesanan Anda'}</h2>
          {selectedTable && <button onClick={() => { resetCart(); setSelectedTable(""); setIsMobileCartOpen(false); }} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100">Lepas meja</button>}
        </div>
        {selectedTableObj && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <div className={\`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm \${selectedTableStatus === 'open' ? 'bg-red-50 text-red-700 border border-red-200' : selectedTableStatus === 'lunas' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-green-50 text-green-700 border border-green-200'}\`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
              {selectedTableObj.nomor.replace(/^Meja\\s*/i, '')}
              <span className="opacity-70 ml-1">({selectedTableStatus === 'open' ? 'Open Bill' : selectedTableStatus === 'lunas' ? 'Lunas' : 'Kosong'})</span>
            </div>
            {customerName && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm">
                👤 {customerName}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={\`flex-1 overflow-y-auto \${isMobile ? 'p-6' : 'p-5'} space-y-4 bg-white dark:bg-gray-800\`}>
        {cart.length === 0 && selectedTableStatus === 'lunas' && (
          <div className="text-center mt-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-3xl mb-3 border border-blue-100">🎉</div>
            <p className="font-bold text-gray-800 dark:text-white">Tagihan meja ini sudah LUNAS</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4 text-sm text-yellow-800 text-left w-full">
              <p className="font-bold mb-1">Tambah Pesanan Baru:</p>
              <p className="leading-snug">Pilih menu di samping. Pesanan akan otomatis masuk sebagai <b>Nota Baru</b>.</p>
            </div>
            <button onClick={() => { handleClearTable(); setIsMobileCartOpen(false); }} className="w-full mt-4 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm transition-colors">Kosongkan Meja (Selesai)</button>
          </div>
        )}
        
        {cart.length === 0 && selectedTableStatus !== 'lunas' && (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-12 flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
            <p className="font-medium text-sm">Belum ada pesanan.</p>
          </div>
        )}

        {cart.map(item => (
          <div key={item.id} className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-4">
            <div className="flex-1 pr-3">
              <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm md:text-base leading-tight">{item.nama}</h4>
              <p className="text-yellow-600 dark:text-yellow-500 text-sm font-black mt-1">Rp {item.harga.toLocaleString('id-ID')}</p>
            </div>
            <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
              <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 flex items-center justify-center font-black transition-colors">-</button>
              <span className="w-8 text-center font-bold text-gray-800 dark:text-white text-sm">{item.qty}</span>
              <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-md bg-yellow-500 hover:bg-yellow-400 text-white flex items-center justify-center font-black transition-colors">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className={\`\${isMobile ? 'p-6 pb-8' : 'p-5'} bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]\`}>
        <div className="flex justify-between items-end mb-4">
          <span className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-wider">Total Pembayaran</span>
          <span className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">Rp {totalPrice.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex gap-2">
          {editingOrderId && (
            <button onClick={handleShowDraftBill} className="w-1/3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white py-4 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition-all">📝 Draft</button>
          )}
          <button onClick={() => setIsPaymentModalOpen(true)} className={\`\${editingOrderId ? 'w-2/3' : 'w-full'} bg-yellow-500 hover:bg-yellow-400 text-gray-900 py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all\`} disabled={cart.length === 0}>
            Bayar Pesanan
          </button>
        </div>
      </div>
    </>
  );
`;

const newCode = `
          {/* Floating Cart Button (Mobile) */}
          {(!isMobileCartOpen && (cart.length > 0 || selectedTable)) && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30">
              <button 
                onClick={() => setIsMobileCartOpen(true)}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-2xl py-3.5 px-5 flex justify-between items-center shadow-xl active:scale-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/40 px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" /></svg>
                    {cart.reduce((s, i) => s + i.qty, 0)}
                  </div>
                  <div className="text-left leading-tight text-gray-900">
                     <span className="block text-[11px] opacity-80 font-bold uppercase tracking-wider">{selectedTableObj ? \`Meja \${selectedTableObj.nomor.replace(/^Meja\\s*/i, '')}\` : 'Tanpa Meja'}</span>
                     <span className="block font-black text-sm">Lihat Pesanan</span>
                  </div>
                </div>
                <div className="font-black text-xl tracking-tight bg-white/20 px-3 py-1 rounded-xl shadow-sm">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </div>
              </button>
            </div>
          )}

          {/* Desktop Sidebar Cart */}
          <div className="hidden lg:flex flex-col w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-40">
             {renderCartInner(false)}
          </div>

          {/* Mobile Bottom Sheet Cart (Gojek/McD Style) */}
          {isMobileCartOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileCartOpen(false)}></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] w-full animate-in slide-in-from-bottom-2 duration-300">
                
                {/* Pull Handle */}
                <div className="flex justify-center p-3 cursor-pointer absolute top-0 left-0 right-0 z-10" onClick={() => setIsMobileCartOpen(false)}>
                  <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>

                {renderCartInner(true)}
              </div>
            </div>
          )}
        </div>
`;

// we must inject cartInnerFunc before `return (`
let finalCode = beforeFloatingBar;
finalCode = finalCode.replace('  return (', cartInnerFunc + '\n  return (');
finalCode += newCode + afterReturn;

// Fix the lg:pb-0 again
finalCode = finalCode.replace(/className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full pb-20 md:pb-0 overflow-hidden transition-colors"/, 'className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full pb-24 lg:pb-0 overflow-hidden transition-colors"');

fs.writeFileSync('src/app/page.tsx', finalCode, 'utf8');
