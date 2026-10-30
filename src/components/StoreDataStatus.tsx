"use client";
import React from 'react';
export default function StoreDataStatus({pending,online,failed,needsReview,failurePhase,allDevicesConfirmed=false}:{pending:number;online:boolean;failed?:boolean;failurePhase?:'send'|'pull';needsReview?:boolean;allDevicesConfirmed?:boolean}){
  const failedLabel=failurePhase!=='pull'&&(failurePhase==='send'||pending>0)?'Pengiriman Belum Berhasil':'Data Belum Diperbarui';
  if(needsReview)return <p role="status" className="text-sm text-amber-800">Stok Perlu Dicek{failed&&online?` · ${failedLabel}`:''}{pending>0?` · ${pending} Data Belum Terkirim`:''}{!online?' · Tidak Tersambung':''}</p>;
  if(!online)return <p role="status" className="text-sm text-amber-800">Tidak Tersambung{pending>0?` · ${pending} Data Belum Terkirim`:''}</p>;
  if(failed)return <p role="status" className="text-sm text-red-700">{failedLabel}{pending>0?` · ${pending} Data Belum Terkirim`:''}</p>;
  if(pending>0)return <p role="status" className="text-sm text-amber-800">{pending} Data Belum Terkirim</p>;
  return null;
}
