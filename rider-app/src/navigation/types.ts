export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  OrderDetail: {orderId: string};
  InAppMap: {
    orderId: string;
    destinationLat?: number;
    destinationLng?: number;
    address: string;
  };
  Earnings: undefined;
};
