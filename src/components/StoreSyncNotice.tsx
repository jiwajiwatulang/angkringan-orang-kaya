'use client';
import {createContext,useContext,type ReactNode} from 'react';
const Context=createContext<ReactNode>(null);
export const StoreSyncProvider=Context.Provider;
export function StoreSyncNotice(){return useContext(Context);}
