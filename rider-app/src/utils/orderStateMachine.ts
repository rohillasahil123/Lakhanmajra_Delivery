import {OrderStatus} from '../types/rider';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  Assigned: ['Accepted', 'Rejected'],
  Accepted: ['Picked'],
  Rejected: [],
  Picked: ['OutForDelivery'],
  OutForDelivery: ['Delivered'],
  Delivered: [],
};

export const canTransition = (
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean => transitions[currentStatus].includes(nextStatus);

export const assertValidTransition = (
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): void => {
  if (!canTransition(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid order transition from ${currentStatus} to ${nextStatus}`
    );
  }
};

export const getAllowedTransitions = (currentStatus: OrderStatus): OrderStatus[] =>
  transitions[currentStatus];
