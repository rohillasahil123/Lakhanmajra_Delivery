export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  RiderProfile: undefined;
  OrderDetail: {orderId: string};
  InAppMap: {
    orderId: string;
    destinationLat?: number;
    destinationLng?: number;
    address: string;
  };
  Earnings: {initialTab?: 'summary' | 'delivered'} | undefined;
};
