import {apiClient} from './apiClient';
import {
  LocationPayload,
  OrderStatus,
  RiderOrder,
  EarningsSummary,
  RiderDocumentField,
  RiderProfileKycForm,
  RiderProfilePayload,
  UploadableRiderFile,
} from '../types/rider';

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

  async getProfile(): Promise<RiderProfilePayload> {
    const response = await apiClient.get<{profile: RiderProfilePayload}>('/rider/profile');
    return response.data.profile;
  },

  async requestProfileOtp(): Promise<{message: string; expiresInSeconds?: number}> {
    const response = await apiClient.post<{message: string; expiresInSeconds?: number}>('/rider/profile/request-otp');
    return response.data;
  },

  async updateProfile(payload: RiderProfileKycForm): Promise<RiderProfilePayload> {
    const response = await apiClient.put<{profile: RiderProfilePayload}>('/rider/profile', payload);
    return response.data.profile;
  },

  async uploadDocument(field: RiderDocumentField, file: UploadableRiderFile): Promise<string> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.fileName || `${field}-${Date.now()}.jpg`,
      type: file.mimeType || 'image/jpeg',
    } as any);

    const response = await apiClient.post<{url: string}>(
      `/rider/upload-document?field=${encodeURIComponent(field)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.url;
  },
};
