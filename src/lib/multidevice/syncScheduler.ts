import Dexie,{liveQuery} from 'dexie';

type Mode='cashier'|'owner'|'kitchen';
type Clock={now:()=>number;set:(fn:()=>void,ms:number)=>unknown;clear:(id:unknown)=>void};
const clock:Clock={now:Date.now,set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)};
export class SyncScheduler {
  private timer:unknown;private due=Infinity;private stopped=true;private running=false;
  private dirty=false;private empty=0;private failed=false;private activeUntil=0;
  constructor(private options:{sync:()=>Promise<{changed:boolean;pending:boolean}>;online:()=>boolean;visible:()=>boolean;mode:()=>Mode},private time:Clock=clock){}
  start(){this.stopped=false;this.wake();}
  stop(){this.stopped=true;this.cancel();}
  wake(){this.activeUntil=this.time.now()+30000;void this.run();}
  localChange(){this.dirty=true;this.activeUntil=this.time.now()+30000;void this.run();}
  visibilityChanged(){if(this.options.visible())this.wake();else this.cancel();}
  activity(){
    if(this.stopped||!this.options.visible())return;
    this.activeUntil=this.time.now()+30000;
    if(!this.running)this.schedule(this.delay());
  }
  private cancel(){if(this.timer!==undefined)this.time.clear(this.timer);this.timer=undefined;this.due=Infinity;}
  private delay(){
    if(this.failed)return 3000; // Retry policy is unchanged in this stage.
    const mode=this.options.mode();if(mode==='kitchen')return 5000;
    if(this.time.now()<this.activeUntil)return mode==='owner'?15000:10000;
    return this.empty<2?30000:60000;
  }
  private schedule(ms:number){
    if(this.stopped||!this.options.online()||!this.options.visible())return;
    const due=this.time.now()+ms;if(this.due<=due)return;
    this.cancel();this.due=due;
    this.timer=this.time.set(()=>{this.timer=undefined;this.due=Infinity;void this.run();},ms);
  }
  private async run(){
    if(this.stopped)return;
    this.cancel();if(this.running||!this.options.online()||!this.options.visible()&&!this.dirty)return;
    this.running=true;this.dirty=false;
    try{
      const result=await this.options.sync();this.failed=false;
      if(result.changed||result.pending){this.empty=0;this.activeUntil=this.time.now()+30000;}else this.empty++;
    }catch{this.failed=true;this.empty=0;} // The caller retains its existing error/access handling.
    finally{
      this.running=false;
      if(!this.stopped&&this.dirty&&this.options.online())void this.run();else this.schedule(this.delay());
    }
  }
}

// Observe committed local changes; never send from inside the transaction being saved.
export function watchPosCommits(db:Dexie,notify:(pending:boolean,changed:boolean)=>void){
  let previous:number|undefined;
  return liveQuery(async()=>({ordinal:Number((await db.table('posMeta').get('ordinal'))?.value||0),pending:await db.table('posOutbox').count()})).subscribe({
    next:state=>{const changed=previous===undefined?state.pending>0:state.ordinal!==previous;previous=state.ordinal;notify(state.pending>0,changed);},
    error:()=>{}, // Existing readiness/status queries surface storage errors without deleting queued work.
  });
}
