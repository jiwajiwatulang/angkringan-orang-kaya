export type ExampleBusiness = 'warung' | 'retail' | 'cafe';
export interface ExampleProduct { id: string; name: string; price: number; weighted?: boolean }
export const EXAMPLE_PRODUCTS: Record<ExampleBusiness, ExampleProduct[]> = {
  warung: [{id:'beras',name:'Beras Premium 5 kg',price:75000},{id:'minyak',name:'Minyak Goreng 1 L',price:18000}],
  retail: [{id:'susu',name:'Susu Kotak',price:6500},{id:'roti',name:'Roti Cokelat',price:8000}],
  cafe: [{id:'kopi',name:'Kopi Susu',price:18000},{id:'matcha',name:'Matcha Latte',price:24000}],
};
// This example never reads or writes a store, license, or payment.
export function exampleGrams(value:string,unit:'g'|'kg'):number|undefined {
  const clean=value.trim().replace(',','.');
  if(unit==='g'&&!/^\d+$/.test(clean))return;
  if(!/^\d+(?:\.\d{1,3})?$/.test(clean))return;
  const [whole,fraction='']=clean.split('.');
  const thousandths=Number(whole)*1000+Number(fraction.padEnd(3,'0'));
  const grams=unit==='kg'?thousandths:thousandths/1000;
  if(Number.isSafeInteger(grams)&&grams>0&&grams<=100000)return grams;
}
export function exampleAmount(product:ExampleProduct,quantity:number):number {
  return Math.round(product.price*quantity/(product.weighted?1000:1));
}
