import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminNavigationHref} from '../src/lib/adminNavigation';
import {exampleReceipt,exampleReceiptDocument} from '../src/lib/homepageReceipt';
import {EXAMPLE_PRODUCTS} from '../src/lib/homepageExample';
test('admin navigation retains demo alongside existing filters and anchors without duplicating flags',()=>{
  assert.equal(adminNavigationHref('/admin',true),'/admin?demo=true');
  assert.equal(adminNavigationHref('/admin/menu?tab=stock#items',true),'/admin/menu?tab=stock&demo=true#items');
  assert.equal(adminNavigationHref('/admin?demo=true',true),'/admin?demo=true');
  assert.equal(adminNavigationHref('/admin',false),'/admin');
});
test('printed examples carry the same unit prices, amounts, notes and total as the cart',()=>{
  const receipt=exampleReceipt([{product:EXAMPLE_PRODUCTS.warung[0],quantity:2,note:'Pisahkan kantong'},{product:EXAMPLE_PRODUCTS.warung[1],quantity:1,note:''}],'warung',new Date('2026-10-28T07:00:00Z'));
  assert.equal(receipt.total,168000);
  assert.equal(receipt.items[0].detail,'2 × Rp75.000/pcs');
  for(const width of ['58mm','80mm'] as const){const doc=exampleReceiptDocument(receipt,width);assert.ok(doc.html.includes(`body{width:${width}`));for(const text of ['CONTOH-001','Kasir Contoh','Pisahkan kantong','Rp150.000','Rp18.000','Rp168.000','Bukan bukti pembayaran']){assert.ok(doc.html.includes(text),text);assert.ok(doc.text.includes(text),text);}}
});
test('print content escapes malicious notes and product names and removes printer control characters',()=>{
  const receipt=exampleReceipt([{product:{id:'bad',name:'<img src=x onerror=alert(1)>',price:1000},quantity:1,note:'<script>bad()</script>\x1bCUT'}],'cafe',new Date());
  const doc=exampleReceiptDocument(receipt,'58mm');
  assert.ok(!doc.html.includes('<script>'));assert.ok(!doc.html.includes('<img src=x'));assert.ok(doc.html.includes('&lt;script&gt;'));
  assert.ok(!doc.text.includes('\x1b'));assert.ok(doc.html.includes("default-src 'none'"));
});
