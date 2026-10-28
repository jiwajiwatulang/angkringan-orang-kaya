import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pairingCode,readPairingIntent} from '../src/lib/multidevice/pairingIntent';
import {PAIRING_MS} from '../src/lib/multidevice/protocol';
const code='a'.repeat(43);
test('pairing accepts only a correctly formed code or trusted pairing URL',()=>{
  assert.equal(pairingCode(code,'https://sakunota.my.id'),code);
  assert.equal(pairingCode(`https://www.sakunota.my.id/hubungkan-perangkat#code=${code}`,'https://sakunota.my.id'),code);
  assert.equal(pairingCode(`http://localhost:4385/hubungkan-perangkat#code=${code}`,'http://127.0.0.1:4385'),code);
  for(const value of ['','1234',`https://example.org/hubungkan-perangkat#code=${code}`,`https://sakunota.my.id/pos#code=${code}`,`http://sakunota.my.id/hubungkan-perangkat#code=${code}`,`https://user:password@sakunota.my.id/hubungkan-perangkat#code=${code}`])assert.equal(pairingCode(value,'https://sakunota.my.id'),'');
});
test('an unexpired pairing resumes the same name and request; expired or malformed intent is not resumed',()=>{
  const now=Date.now(),intent={code,name:'Kasir Depan',waiting:true,expiresAt:now+PAIRING_MS};
  assert.deepEqual(readPairingIntent(JSON.stringify(intent),now),intent);
  assert.equal(readPairingIntent(JSON.stringify(intent),now+PAIRING_MS),null);
  for(const patch of [{code:'1234'},{waiting:'true'},{name:null},{expiresAt:now+PAIRING_MS+1}])assert.equal(readPairingIntent(JSON.stringify({...intent,...patch}),now),null);
  assert.equal(readPairingIntent('{'),null);
});
