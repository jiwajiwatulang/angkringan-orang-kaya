import type {AccessClaims} from './protocol';
export const POS_TABLES=['menuItems','tables','orders','orderItems','payments','paymentProofs','shifts','cashMovements','inventoryMovements','auditLogs'] as const;
export type PosTable=typeof POS_TABLES[number];
export interface PosRow {table:PosTable;id:string;expectedVersion:number;value:Record<string,any>}
export interface PosCommit {id:string;storeId:string;deviceId:string;operatorId:string;kind:'pos.commit';entityId:string;data:{rows:PosRow[];bootstrap?:boolean}}
export interface PosScope {claims:AccessClaims;operatorName:string;access:string;importingLegacy?:boolean}
export const FOREIGN_KEYS:Partial<Record<PosTable,Record<string,PosTable>>>={orders:{shiftId:'shifts',tableId:'tables'},orderItems:{orderId:'orders',menuItemId:'menuItems'},payments:{orderId:'orders',shiftId:'shifts',refundShiftId:'shifts',proofId:'paymentProofs'},paymentProofs:{orderId:'orders',paymentId:'payments'},cashMovements:{shiftId:'shifts'},inventoryMovements:{orderId:'orders',menuItemId:'menuItems'},auditLogs:{orderId:'orders'}};
let scope:PosScope|undefined;
export function setPosScope(next:PosScope|undefined){scope=next;}
export function getPosScope(){return scope;}
