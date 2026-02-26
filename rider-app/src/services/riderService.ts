import {apiClient} from './apiClient';
import {LocationPayload, OrderStatus, RiderOrder, EarningsSummary} from '../types/rider';

export const riderService = {
  async getOrders(): Promise<RiderOrder[]> {
    const response = await apiClient.get<{orders: RiderOrder[]}>('/rider/orders');
    return response.data.orders;
  },

  async getOrderById(orderId: string): Promise<RiderOrder> {
    const response = await apiClient.get<{order: RiderOrder}>(`/rider/orders/${orderId}`);
    return response.data.order;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<RiderOrder> {
    const response = await apiClient.patch<{order: RiderOrder}>(
      `/rider/orders/${orderId}/status`,
      {status}
    );
    return response.data.order;
  },

  async updateOnlineStatus(online: boolean): Promise<void> {
    await apiClient.patch('/rider/status', {online});
  },

  async sendLocation(payload: LocationPayload): Promise<void> {
    await apiClient.post('/rider/location', payload);
  },

  async getEarnings(): Promise<EarningsSummary> {
    const response = await apiClient.get<{earnings: EarningsSummary}>('/rider/earnings');
    return response.data.earnings;
  },
};
