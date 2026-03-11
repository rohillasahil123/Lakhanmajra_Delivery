import {RiderProfileKycForm} from '../types/rider';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  RiderProfile: undefined;
  RiderProfileOtp: {profileDraft: RiderProfileKycForm; otpMessage?: string};
  DeliveredOrders: undefined;
  OrderDetail: {orderId: string};
  InAppMap: {
    orderId: string;
    destinationLat?: number;
    destinationLng?: number;
    address: string;
  };
  Earnings: undefined;
};
