"use client";
import React from 'react';
export default function StoreDataStatus({pending,online,failed,needsReview,allDevicesConfirmed=false}:{pending:number;online:boolean;failed?:boolean;needsReview?:boolean;allDevicesConfirmed?:boolean}){
  if(needsReview)return <p role="status" className="text-sm text-amber-800">Stok Perlu Dicek{failed?' · Pengiriman Belum Berhasil':''}{pending>0?` · ${pending} Data Belum Terkirim`:''}{!online?' · Tidak Tersambung':''}</p>;
  if(!online)return <p role="status" className="text-sm text-amber-800">Tidak Tersambung{pending>0?` · ${pending} Data Belum Terkirim`:''}</p>;
  if(failed)return <p role="status" className="text-sm text-red-700">Pengiriman Belum Berhasil</p>;
  if(pending>0)return <p role="status" className="text-sm text-amber-800">{pending} Data Belum Terkirim</p>;
  return <p role="status" className="text-sm text-muted">{allDevicesConfirmed?'Semua Data Terbaru':'Data Terakhir Diterima'}</p>;
}
