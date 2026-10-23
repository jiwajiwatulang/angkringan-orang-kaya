import type {LocalReplica,Transport} from './replica';
export interface UpdateStatus {pending:number;lastUpdated?:number;online:boolean;failed:boolean}
export interface Connectivity {
  online():boolean;
  subscribe(listener:()=>void):()=>void;
}
export function browserConnectivity():Connectivity {
  return {online:()=>navigator.onLine,subscribe:listener=>{
    window.addEventListener('online',listener);window.addEventListener('offline',listener);
    document.addEventListener('visibilitychange',listener);
    return()=>{window.removeEventListener('online',listener);window.removeEventListener('offline',listener);document.removeEventListener('visibilitychange',listener);};
  }};
}
// No network operation is awaited by checkout. Closing the browser leaves the durable outbox intact.
export function startStoreUpdates(replica:LocalReplica,transport:Transport,changed:(status:UpdateStatus)=>void,connection:Connectivity=browserConnectivity()) {
  let stopped=false,running=false,scheduled:ReturnType<typeof setTimeout>|undefined;
  const publish=async(failed=false)=>{const status=await replica.status();if(!stopped)changed({...status,online:connection.online(),failed});};
  const run=async()=>{
    if(stopped||running)return;running=true;
    try {if(connection.online())await replica.synchronize(transport);await publish();}
    catch{await publish(true);}
    finally{running=false;}
  };
  const schedule=()=>{if(stopped)return;if(scheduled)clearTimeout(scheduled);scheduled=setTimeout(()=>{void run();},250);};
  const unsubscribe=connection.subscribe(schedule),pending=replica.onPending(schedule);
  const interval=setInterval(()=>{void run();},30000);void run();
  return()=>{stopped=true;unsubscribe();pending();clearInterval(interval);if(scheduled)clearTimeout(scheduled);};
}
