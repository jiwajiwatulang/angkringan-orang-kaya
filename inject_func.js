const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

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

c = c.replace('  if (isLoading) return <div', cartInnerFunc + '\n  if (isLoading) return <div');
fs.writeFileSync('src/app/page.tsx', c, 'utf8');
