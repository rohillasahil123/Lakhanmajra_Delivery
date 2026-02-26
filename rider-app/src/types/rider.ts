export type PaymentType = 'COD' | 'PREPAID';

export type OrderStatus =
  | 'Assigned'
  | 'Accepted'
  | 'Rejected'
  | 'Picked'
  | 'OutForDelivery'
  | 'Delivered';

export interface Customer {
  name: string;
  phone: string;
}

export interface DeliveryAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

export interface RiderOrder {
  id: string;
  riderId: string;
  status: OrderStatus;
  paymentType: PaymentType;
  amount: number;
  customer: Customer;
  deliveryAddress: DeliveryAddress;
  assignedAt: string;
  updatedAt: string;
}

export interface EarningsSummary {
  today: number;
  weekly: number;
  pendingPayouts: number;
  currency: string;
}

export interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  role: 'rider';
  online: boolean;
}

export interface AuthSession {
  accessToken: string;
  rider: RiderProfile;
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}
