import type { Payment, RefundEvent } from './dexie';

/** Amount still applied to the bill, independent of the last refund status. */
export function retainedPaymentAmount(payment: Payment): number {
  if (payment.status === 'refunded') return 0;
  return Math.max(0, payment.amount - (payment.refundedAmount || 0));
}

/** Preserve recorded legacy refunds without counting a payment's event ledger twice. */
export function paymentRefundEvents(payments: Payment[], events: RefundEvent[]): RefundEvent[] {
  const result = [...events];
  for (const p of payments) {
    const recorded = events.filter(r => r.paymentId === p.id).reduce((sum, r) => sum + r.amount, 0);
    const total = p.refundedAmount ?? (p.status === 'refunded'
      ? (p.paymentMethod === 'Cash' ? (p.cashRefundAmount ?? p.amount)
        : p.refundReason?.startsWith('Void Nota:') ? (p.cashRefundAmount || 0) : p.amount) : 0);
    const missing = total - recorded;
    if (missing > 0 && p.refundedAt && p.id !== undefined) {
      result.push({
        idempotencyKey: `legacy-payment-refund-${p.id}`, orderId: p.orderId, paymentId: p.id,
        shiftId: p.refundShiftId ?? p.shiftId ?? null, type: 'PARTIAL_REFUND', amount: missing,
        method: (p.cashRefundAmount || 0) > 0 ? 'Cash' : p.paymentMethod, reason: p.refundReason || 'Legacy refund',
        operatorName: p.refundOperator || p.operatorName, createdAt: p.refundedAt
      });
    }
  }
  return result;
}
