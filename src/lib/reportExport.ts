export function csvCell(value:unknown){const raw=String(value??'');const safe=typeof value==='string'&&/^[\s]*[=+@-]/.test(raw)?`'${raw}`:raw;return `"${safe.replace(/"/g,'""')}"`;}
export async function exportReport(rows:Record<string,unknown>[],format:'csv'|'xlsx',name:string){
  if(!rows.length)throw new Error('Belum ada data untuk diekspor');
  if(format==='xlsx'){
    const XLSX=await import('xlsx'),sheet=XLSX.utils.json_to_sheet(rows),book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Laporan');XLSX.writeFile(book,`${name}.xlsx`);return;
  }
  const keys=Object.keys(rows[0]),csv='\uFEFF'+[keys.map(csvCell).join(','),...rows.map(row=>keys.map(k=>csvCell(row[k])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`${name}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
