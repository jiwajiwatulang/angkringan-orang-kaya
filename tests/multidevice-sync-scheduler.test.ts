import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SyncScheduler,watchPosCommits} from '../src/lib/multidevice/syncScheduler';
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function harness(sync:()=>Promise<{changed:boolean;pending:boolean}>=async()=>({changed:false,pending:false})){
 let now=0,id=0,visible=true,online=true,mode:'cashier'|'owner'|'kitchen'='cashier',calls=0;
 const timers=new Map<number,{at:number;fn:()=>void}>();
 const loop=new SyncScheduler({sync:async()=>{calls++;return sync();},online:()=>online,visible:()=>visible,mode:()=>mode},{now:()=>now,set:(fn,ms)=>{timers.set(++id,{at:now+ms,fn});return id;},clear:id=>{timers.delete(id as number);}});
 const tick=async(ms:number)=>{const end=now+ms;for(;;){const next=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await settle();}now=end;await settle();};
 return {loop,tick,calls:()=>calls,timers:()=>timers.size,visible:(value:boolean)=>{visible=value;},online:(value:boolean)=>{online=value;},mode:(value:typeof mode)=>{mode=value;}};
}
test('idle devices reduce empty polling while local saves wake delivery immediately',async()=>{
 const h=harness();h.loop.start();await settle();await h.tick(8*60*60*1000);
 assert.ok(h.calls()<=485,`idle calls: ${h.calls()}`);assert.ok(h.calls()>470);
 const before=h.calls();h.loop.localChange();await settle();assert.equal(h.calls(),before+1);
 h.loop.stop();assert.equal(h.timers(),0);
});
test('background pauses polling, committed work may finish, and foreground refreshes immediately',async()=>{
 const h=harness();h.visible(false);h.loop.start();await settle();assert.equal(h.calls(),0);
 h.loop.localChange();await settle();assert.equal(h.calls(),1);await h.tick(120000);assert.equal(h.calls(),1);
 h.visible(true);h.loop.visibilityChanged();await settle();assert.equal(h.calls(),2);
 h.visible(false);h.loop.visibilityChanged();await h.tick(120000);assert.equal(h.calls(),2);
 h.loop.stop();
});
test('offline preserves a pending wake and resumes without periodic offline calls',async()=>{
 const h=harness();h.online(false);h.loop.start();h.loop.localChange();await h.tick(120000);assert.equal(h.calls(),0);
 h.online(true);h.loop.wake();await settle();assert.equal(h.calls(),1);h.loop.stop();
});
test('kitchen remains fast, owner cadence is distinct, and interaction does not send per keystroke',async()=>{
 const h=harness();h.mode('kitchen');h.loop.start();await settle();await h.tick(20000);assert.equal(h.calls(),5);h.loop.stop();
 const owner=harness();owner.mode('owner');owner.loop.start();await settle();await owner.tick(14999);assert.equal(owner.calls(),1);await owner.tick(1);assert.equal(owner.calls(),2);owner.loop.stop();
 const idle=harness();idle.loop.start();await settle();await idle.tick(90000);const before=idle.calls();
 for(let i=0;i<20;i++)idle.loop.activity();await settle();assert.equal(idle.calls(),before);
 await idle.tick(10000);assert.equal(idle.calls(),before+1);idle.loop.stop();
});
test('a commit during an in-flight request triggers one follow-up without overlap',async()=>{
 let release!:()=>void,active=0,max=0,first=true;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const h=harness(async()=>{max=Math.max(max,++active);if(first){first=false;await gate;}active--;return {changed:false,pending:false};});
 h.loop.start();await settle();h.loop.localChange();h.loop.localChange();assert.equal(h.calls(),1);release();await settle();
 assert.equal(h.calls(),2);assert.equal(max,1);h.loop.stop();await h.tick(120000);assert.equal(h.calls(),2);
});
test('failure retry keeps its previous cadence and stopping prevents later work',async()=>{
 let first=true;const h=harness(async()=>{if(first){first=false;throw new Error('offline');}return {changed:false,pending:false};});
 h.loop.start();await settle();await h.tick(2999);assert.equal(h.calls(),1);await h.tick(1);assert.equal(h.calls(),2);h.loop.stop();
});
test('local watcher wakes only for durable committed work and ignores rollback/ack updates',async()=>{
 const db=new Dexie('sync-watch-'+crypto.randomUUID());db.version(1).stores({posMeta:'key',posOutbox:'id'});
 let initial!:()=>void,changed!:()=>void,changes=0;
 const ready=new Promise<void>(resolve=>{initial=resolve;}),saved=new Promise<void>(resolve=>{changed=resolve;});
 const watch=watchPosCommits(db,(_pending,dirty)=>{initial();if(dirty){changes++;changed();}});
 try{
  await ready;
  await assert.rejects(db.transaction('rw',['posMeta','posOutbox'],async()=>{await db.table('posMeta').put({key:'ordinal',value:1});await db.table('posOutbox').put({id:'aborted'});assert.equal(changes,0);throw new Error('rollback');}),/rollback/);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(changes,0);
  await db.transaction('rw',['posMeta','posOutbox'],async()=>{await db.table('posMeta').put({key:'ordinal',value:1});await db.table('posOutbox').put({id:'saved'});assert.equal(changes,0);});
  await saved;assert.equal(changes,1);
  await db.table('posOutbox').delete('saved');await db.table('posMeta').put({key:'lastUpdated',value:Date.now()});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(changes,1);
 }finally{watch.unsubscribe();await db.delete();}
});
