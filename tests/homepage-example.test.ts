import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exampleGrams,exampleAmount,EXAMPLE_PRODUCTS} from '../src/lib/homepageExample';
test('homepage weight example accepts Indonesian decimals and equal gram/kg amounts',()=>{
  const rice=EXAMPLE_PRODUCTS.warung[0];
  assert.equal(exampleGrams('250','g'),250);
  assert.equal(exampleGrams('0,25','kg'),250);
  assert.equal(exampleGrams('1.25','kg'),1250);
  assert.equal(exampleAmount(rice,250),4500);
  assert.equal(exampleAmount(rice,1250),22500);
});
test('weight example rejects partial parses, subgram quantities and excessive values',()=>{
  for(const value of ['','0','-1','1e3','250 g','1,2.3','Infinity','0.5','1.000','1,000'])assert.equal(exampleGrams(value,'g'),undefined,value);
  assert.equal(exampleGrams('100,001','kg'),undefined);
  assert.equal(exampleGrams('0,001','kg'),1);
  assert.equal(exampleGrams('0,0001','kg'),undefined);
});
test('example prices round rupiah and retail quantities remain whole items',()=>{
  assert.equal(exampleAmount(EXAMPLE_PRODUCTS.warung[1],125),2125);
  assert.equal(exampleAmount({id:'rounding',name:'Beras',price:19999,weighted:true},1),20);
  assert.equal(exampleAmount(EXAMPLE_PRODUCTS.retail[0],3),19500);
});
