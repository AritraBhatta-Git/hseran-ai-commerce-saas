export type OrderStatusType =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export const ORDER_TRANSITIONS: Record<
  OrderStatusType,
  OrderStatusType[]
> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(
  current: OrderStatusType,
  next: OrderStatusType,
): boolean {
  return ORDER_TRANSITIONS[current]?.includes(next);
}

export function canCancel(status: OrderStatusType): boolean {
  return ['PENDING', 'CONFIRMED'].includes(status);
}