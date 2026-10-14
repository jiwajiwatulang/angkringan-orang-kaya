"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getStoreSettings, loadStoreSettingsAsync, subscribeStoreSettings, StoreSettings } from "@/lib/settings";

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AdminContextType {
  storeSettings: StoreSettings;
  setStoreSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  refreshSettings: () => Promise<void>;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(getStoreSettings());
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const refreshSettings = async () => {
    try {
      const fresh = await loadStoreSettingsAsync();
      setStoreSettings(fresh);
    } catch (_) {
      setStoreSettings(getStoreSettings());
    }
  };

  useEffect(() => {
    refreshSettings();
    const unsubscribe = subscribeStoreSettings((updated) => {
      setStoreSettings(updated);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const logout = () => {
    localStorage.removeItem("adminLoginExpiry");
    setIsAuthenticated(false);
  };

  return (
    <AdminContext.Provider
      value={{
        storeSettings,
        setStoreSettings,
        refreshSettings,
        toasts,
        showToast,
        removeToast,
        isAuthenticated,
        setIsAuthenticated,
        logout,
      }}
    >
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[120] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto cursor-pointer p-3.5 rounded-2xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              t.type === 'success'
                ? 'bg-emerald-900/90 border-emerald-700 text-white dark:bg-emerald-950 dark:border-emerald-600'
                : t.type === 'error'
                ? 'bg-rose-900/90 border-rose-700 text-white dark:bg-rose-950 dark:border-rose-600'
                : 'bg-gray-900/90 border-gray-700 text-white dark:bg-gray-800 dark:border-gray-600'
            }`}
          >
            <span className="text-lg">
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p className="text-xs font-semibold flex-1 leading-snug">{t.message}</p>
          </div>
        ))}
      </div>
    </AdminContext.Provider>
  );
}
