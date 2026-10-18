export function cashierCanSeeOrder(order: { status: string; shiftId?: number | null; isHistorical?: boolean }, activeShiftId?: number | null): boolean {
  if (order.isHistorical || order.status === 'void') return false;
  return order.status === 'unpaid' || (activeShiftId != null && order.shiftId === activeShiftId);
}
