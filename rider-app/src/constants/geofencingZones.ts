// Define all delivery zones - Cities and Villages
export interface DeliveryZone {
  id: string;
  name: string;
  type: 'city' | 'village';
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'lakhanmajra',
    name: 'Lakhanmajra',
    type: 'village',
    latitude: 29.048038,
    longitude: 76.477933,
    radiusKm: 3, // Rohtak, Haryana - Pincode: 124514
  },
];

// Get zone name by id
export const getZoneNameById = (id: string): string => {
  const zone = DELIVERY_ZONES.find((z) => z.id === id);
  return zone?.name || 'Unknown Area';
};
