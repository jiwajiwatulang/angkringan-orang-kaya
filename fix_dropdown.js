const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

const regex = /<select[\s\S]*?<\/select>/;

const replacement = `<div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                      {tableData.map(table => {
                        const tStatus = getTableStatus(table);
                        const isSelected = selectedTable === table.id.toString();
                        const bgClass = tStatus === 'open' ? 'bg-red-100 text-red-800 border-red-300' : tStatus === 'lunas' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-green-100 text-green-800 border-green-300';
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => setSelectedTable(table.id.toString())}
                            className={\`py-2 px-1 rounded-lg border-2 text-xs font-bold transition-all \${bgClass} \${isSelected ? 'ring-2 ring-yellow-500 ring-offset-1 scale-105 shadow-md' : 'opacity-80 hover:opacity-100'}\`}
                          >
                            {table.nomor.replace(/^Meja\s*/i, '')}
                          </button>
                        );
                      })}
                    </div>`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/app/page.tsx', c, 'utf8');
