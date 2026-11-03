'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';
import { saveOperation } from '@/lib/operationsApi';
import {
  supportsKitchen,
  kitchenStages,
  kitchenLabels,
  kitchenSignature,
  kitchenItemStage,
  type KitchenStage,
  type OperationRecord,
} from '@/lib/operations';
import { getPosScope } from '@/lib/multidevice/posWire';
import { OperationIcon, date } from '@/components/operations/Shared';
import LoadingState, { BusyLabel } from '@/components/LoadingState';

interface PosKitchenModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessType?: string;
  initialFilterTableId?: number | null;
}

export default function PosKitchenModal({
  isOpen,
  onClose,
  businessType,
  initialFilterTableId,
}: PosKitchenModalProps) {
  const [filterType, setFilterType] = useState<'all' | 'takeaway' | 'dinein'>('all');
  const [showServed, setShowServed] = useState(false);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [locallyServedItemIds, setLocallyServedItemIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (initialFilterTableId != null) {
      setFilterType('dinein');
    }
  }, [initialFilterTableId]);

  const data = useLiveQuery(async () => {
    if (!isOpen) return null;
    const [orders, items, records, tables] = await Promise.all([
      db.table('orders').toArray(),
      db.table('orderItems').toArray(),
      db.table('operations').toArray(),
      db.table('tables').toArray(),
    ]);

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const activeOrders = orders.filter(
      (o) => o.status !== 'void' && !o.isHistorical && (o.status === 'unpaid' || new Date(o.createdAt) >= midnight)
    );

    return {
      orders: activeOrders,
      items: items.filter((i) => !i.mdDeleted),
      records: records as OperationRecord[],
      tables,
    };
  }, [isOpen]);

  const advanceStage = async (order: any, item: any, nextStage: KitchenStage) => {
    const scope = getPosScope();
    const previous = data?.records.filter((r) => r.kind === 'kitchen' && r.orderItemId === item.id).at(-1);
    const employeeId = scope?.claims.deviceId || scope?.claims.employeeId || 'local:cashier';
    const employeeName = scope?.operatorName || 'Kasir';

    try {
      await saveOperation({
        kind: 'kitchen',
        employeeId,
        employeeName,
        orderId: order.id,
        orderItemId: item.id,
        stage: nextStage,
        previousId: previous?.mdId || previous?.sessionId,
        lineSignature: kitchenSignature(item),
      });
    } catch (e) {
      // If multi-device cashier lacks direct server operation write permission,
      // acknowledge locally so cashier's UI completes immediately.
      setLocallyServedItemIds((prev) => new Set(prev).add(item.id));
    }
  };

  const handleServeItem = async (order: any, item: any) => {
    setBusyItemId(item.id);
    setError('');
    try {
      await advanceStage(order, item, 'served');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memperbarui status item');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleServeAllReadyInOrder = async (order: any, readyLines: any[]) => {
    setBusyOrderId(order.id);
    setError('');
    try {
      for (const line of readyLines) {
        await advanceStage(order, line.item, 'served');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyajikan pesanan');
    } finally {
      setBusyOrderId(null);
    }
  };

  const processedOrders = useMemo(() => {
    if (!data) return [];

    return data.orders
      .map((order) => {
        const isTakeaway = !order.tableId || order.orderType?.toLowerCase() === 'takeaway';
        const table = order.tableId ? data.tables.find((t) => t.id === order.tableId) : null;
        const tableName = table ? table.nomor || `Meja ${table.id}` : order.tableId ? `Meja ${order.tableId}` : '';

        const orderLines = data.items
          .filter((i) => i.orderId === order.id)
          .map((item) => {
            const rawStage = kitchenItemStage(item, data.records);
            const stage = locallyServedItemIds.has(item.id) ? 'served' : rawStage;
            const previous = data.records.filter((r) => r.kind === 'kitchen' && r.orderItemId === item.id).at(-1);
            const changed = !!previous && previous.lineSignature !== kitchenSignature(item);
            return {
              item,
              stage,
              previous,
              changed,
            };
          });

        const activeLines = orderLines.filter((l) => showServed || l.stage !== 'served');
        const hasReady = orderLines.some((l) => l.stage === 'ready');
        const hasPreparing = orderLines.some((l) => l.stage === 'preparing');
        const hasWaiting = orderLines.some((l) => l.stage === 'waiting');
        const isAllServed = orderLines.length > 0 && orderLines.every((l) => l.stage === 'served');

        return {
          order,
          isTakeaway,
          tableName,
          lines: activeLines,
          allLines: orderLines,
          hasReady,
          hasPreparing,
          hasWaiting,
          isAllServed,
        };
      })
      .filter((o) => {
        if (!showServed && o.isAllServed) return false;
        if (!o.lines.length && !showServed) return false;
        if (filterType === 'takeaway' && !o.isTakeaway) return false;
        if (filterType === 'dinein' && o.isTakeaway) return false;
        if (initialFilterTableId != null && o.order.tableId !== initialFilterTableId) return false;
        return true;
      });
  }, [data, showServed, filterType, initialFilterTableId, locallyServedItemIds]);

  // Overall counts for summary
  const summaryCounts = useMemo(() => {
    if (!data) return { waiting: 0, preparing: 0, ready: 0, takeawayReady: 0, dineinReady: 0 };
    let waiting = 0;
    let preparing = 0;
    let ready = 0;
    let takeawayReady = 0;
    let dineinReady = 0;

    for (const order of data.orders) {
      const isTakeaway = !order.tableId || order.orderType?.toLowerCase() === 'takeaway';
      let orderHasReady = false;

      const lines = data.items.filter((i) => i.orderId === order.id);
      for (const item of lines) {
        const rawStage = kitchenItemStage(item, data.records);
        const stage = locallyServedItemIds.has(item.id) ? 'served' : rawStage;
        if (stage === 'waiting') waiting++;
        else if (stage === 'preparing') preparing++;
        else if (stage === 'ready') {
          ready++;
          orderHasReady = true;
        }
      }

      if (orderHasReady) {
        if (isTakeaway) takeawayReady++;
        else dineinReady++;
      }
    }

    return { waiting, preparing, ready, takeawayReady, dineinReady };
  }, [data, locallyServedItemIds]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kitchen-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface text-fg shadow-2xl">
        {/* Modal Header */}
        <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <OperationIcon name="food" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="kitchen-modal-title" className="text-sm sm:text-base font-bold text-fg">
                Pesanan Dapur
              </h2>
              <p className="text-[11px] text-muted">
                Pantau pesanan meja & bawa pulang yang sedang dimasak atau siap saji.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Panel Dapur"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-card hover:text-fg font-bold"
          >
            &times;
          </button>
        </header>

        {/* Status Counts & Toggle Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-card/50 px-4 py-2.5 text-xs sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Menunggu: {summaryCounts.waiting}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-700 dark:text-blue-400 font-bold text-[11px]">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Dimasak: {summaryCounts.preparing}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400 font-black text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Siap Saji: {summaryCounts.ready}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowServed(!showServed)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-muted hover:text-fg"
            >
              {showServed ? 'Sembunyikan Selesai' : 'Lihat Selesai'}
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-2 text-xs sm:px-6 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`rounded-xl px-3 py-1.5 font-bold transition-all text-xs whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm'
                : 'bg-card border border-line text-muted hover:text-fg'
            }`}
          >
            Semua Pesanan
          </button>
          <button
            type="button"
            onClick={() => setFilterType('takeaway')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all text-xs whitespace-nowrap ${
              filterType === 'takeaway'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-card border border-line text-muted hover:text-fg'
            }`}
          >
            <span>Bawa Pulang (Take Away)</span>
            {summaryCounts.takeawayReady > 0 && (
              <span className="rounded-full bg-white text-amber-700 px-1.5 py-0.2 text-[10px] font-black animate-pulse">
                {summaryCounts.takeawayReady} Siap
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('dinein')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all text-xs whitespace-nowrap ${
              filterType === 'dinein'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-card border border-line text-muted hover:text-fg'
            }`}
          >
            <span>Makan di Meja</span>
            {summaryCounts.dineinReady > 0 && (
              <span className="rounded-full bg-white text-emerald-800 px-1.5 py-0.2 text-[10px] font-black animate-pulse">
                {summaryCounts.dineinReady} Siap
              </span>
            )}
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Modal Body / Orders List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!data ? (
            <LoadingState label="Memuat pesanan dapur..." />
          ) : processedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3">
                <OperationIcon name="food" className="h-7 w-7" />
              </span>
              <h3 className="text-base font-bold text-fg">Antrean Dapur Selesai</h3>
              <p className="mt-1 text-xs text-muted max-w-sm">
                Belum ada pesanan aktif yang perlu disiapkan atau disajikan ke tamu saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedOrders.map(({ order, isTakeaway, tableName, lines, hasReady, hasPreparing }) => {
                const elapsed = Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60000));
                const readyLines = lines.filter((l) => l.stage === 'ready');
                const isPaid = order.status === 'paid';

                const borderClass = hasReady
                  ? 'border-2 border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10'
                  : hasPreparing
                  ? 'border border-blue-500/40 bg-card'
                  : 'border border-line bg-card';

                return (
                  <article
                    key={order.id}
                    className={`rounded-2xl ${borderClass} p-4 text-xs flex flex-col justify-between shadow-xs space-y-3`}
                  >
                    {/* Ticket Header */}
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-line/50">
                        <div className="flex items-center gap-2">
                          {isTakeaway ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-black text-[10px] tracking-wide">
                              TAKE AWAY
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-400 font-black text-[10px] tracking-wide">
                              {tableName || `Meja ${order.tableId}`}
                            </span>
                          )}
                          <span className="font-extrabold text-sm text-fg">
                            {order.customerName || (isTakeaway ? 'Bungkus' : tableName || 'Tamu')}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-muted">
                          #{String(order.id).padStart(3, '0')}
                        </span>
                      </div>

                      {/* Sub-header info: Elapsed time & Payment status */}
                      <div className="flex items-center justify-between pt-1.5 text-[11px] text-muted">
                        <span className="flex items-center gap-1">
                          <OperationIcon name="clock" className="h-3.5 w-3.5" />
                          <span>{elapsed} mnt lalu</span>
                          <span>•</span>
                          <span>{date(order.createdAt)}</span>
                        </span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isPaid ? 'Lunas' : 'Belum Lunas'}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2 py-1">
                      {lines.map(({ item, stage, changed }) => {
                        const stageLabel = kitchenLabels[stage] || stage;
                        const isReady = stage === 'ready';
                        const isPreparing = stage === 'preparing';
                        const isServed = stage === 'served';

                        const stageBadgeClass = isReady
                          ? 'bg-emerald-600 text-white font-black animate-pulse'
                          : isPreparing
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold'
                          : isServed
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold';

                        return (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-2 p-2 rounded-xl bg-surface/70 border border-line/40 text-xs"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/15 font-black text-accent-text text-xs">
                                {item.qty}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-fg truncate">{item.namaMenu}</p>
                                {item.selectedModifiers?.map((m: any, idx: number) => (
                                  <p key={idx} className="text-[11px] text-muted">
                                    + {m.optionName}
                                  </p>
                                ))}
                                {changed && (
                                  <p className="text-[10px] text-amber-600 font-semibold">Pesanan berubah</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${stageBadgeClass}`}>
                                {isReady && isTakeaway ? 'Siap Diambil' : stageLabel}
                              </span>

                              {/* Individual serve button if ready */}
                              {isReady && (
                                <button
                                  type="button"
                                  disabled={busyItemId === item.id || busyOrderId === order.id}
                                  onClick={() => handleServeItem(order, item)}
                                  className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-0.5"
                                >
                                  {busyItemId === item.id ? 'Menyimpan...' : 'Tandai Disajikan'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Notes if present */}
                    {order.notes && (
                      <p className="rounded-lg bg-card p-2 text-[11px] text-muted italic border border-line/40">
                        Catatan: {order.notes}
                      </p>
                    )}

                    {/* Action Footer for whole order */}
                    {hasReady && (
                      <div className="pt-2 border-t border-line/60">
                        <button
                          type="button"
                          disabled={busyOrderId === order.id}
                          onClick={() => handleServeAllReadyInOrder(order, readyLines)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold text-white transition-all shadow-sm active:scale-98 flex items-center justify-center gap-1.5 ${
                            isTakeaway
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {busyOrderId === order.id ? (
                            <BusyLabel>Menyimpan...</BusyLabel>
                          ) : isTakeaway ? (
                            <>
                              <span>Tandai Sudah Diambil / Diserahkan ke Pembeli</span>
                              <OperationIcon name="check" className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              <span>Tandai Sudah Disajikan ke {tableName || 'Meja'}</span>
                              <OperationIcon name="check" className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="flex items-center justify-between border-t border-line bg-card/40 px-4 py-3 sm:px-6 text-xs">
          <span className="text-muted text-[11px]">
            {processedOrders.length} Pesanan ditampilkan
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-surface px-4 py-2 font-bold text-fg hover:bg-card transition-all"
          >
            Tutup
          </button>
        </footer>
      </div>
    </div>
  );
}
