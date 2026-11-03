'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './dexie';
import { supportsKitchen, kitchenItemStage, type OperationRecord } from './operations';

export interface KitchenSummary {
  isSupported: boolean;
  totalReady: number;
  totalPreparing: number;
  totalWaiting: number;
  takeawayReadyCount: number;
  takeawayPreparingCount: number;
  readyTableIds: Set<number>;
  preparingTableIds: Set<number>;
}

const defaultSummary: KitchenSummary = {
  isSupported: false,
  totalReady: 0,
  totalPreparing: 0,
  totalWaiting: 0,
  takeawayReadyCount: 0,
  takeawayPreparingCount: 0,
  readyTableIds: new Set(),
  preparingTableIds: new Set(),
};

export function useKitchenSummary(businessType?: string): KitchenSummary {
  const isSupported = supportsKitchen(businessType);

  const summary = useLiveQuery(async () => {
    if (!isSupported) return defaultSummary;

    const [orders, items, records] = await Promise.all([
      db.table('orders').toArray(),
      db.table('orderItems').toArray(),
      db.table('operations').toArray(),
    ]);

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const activeOrders = orders.filter(
      (o) => o.status !== 'void' && !o.isHistorical && (o.status === 'unpaid' || new Date(o.createdAt) >= midnight)
    );

    const activeItems = items.filter((i) => !i.mdDeleted);
    const operations = records as OperationRecord[];

    let totalReady = 0;
    let totalPreparing = 0;
    let totalWaiting = 0;
    let takeawayReadyCount = 0;
    let takeawayPreparingCount = 0;
    const readyTableIds = new Set<number>();
    const preparingTableIds = new Set<number>();

    for (const order of activeOrders) {
      const orderLines = activeItems.filter((i) => i.orderId === order.id);
      if (!orderLines.length) continue;

      let orderHasReady = false;
      let orderHasPreparing = false;

      for (const line of orderLines) {
        const stage = kitchenItemStage(line, operations);
        if (stage === 'ready') {
          totalReady++;
          orderHasReady = true;
        } else if (stage === 'preparing') {
          totalPreparing++;
          orderHasPreparing = true;
        } else if (stage === 'waiting') {
          totalWaiting++;
        }
      }

      const isTakeaway = !order.tableId || order.orderType?.toLowerCase() === 'takeaway';

      if (isTakeaway) {
        if (orderHasReady) takeawayReadyCount++;
        else if (orderHasPreparing) takeawayPreparingCount++;
      } else if (order.tableId) {
        const tid = Number(order.tableId);
        if (orderHasReady) readyTableIds.add(tid);
        else if (orderHasPreparing) preparingTableIds.add(tid);
      }
    }

    return {
      isSupported: true,
      totalReady,
      totalPreparing,
      totalWaiting,
      takeawayReadyCount,
      takeawayPreparingCount,
      readyTableIds,
      preparingTableIds,
    };
  }, [isSupported]);

  return summary || (isSupported ? { ...defaultSummary, isSupported: true } : defaultSummary);
}
