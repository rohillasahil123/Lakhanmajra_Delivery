/**
 * Location Type Definitions
 * Represents user location and delivery address
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  address: string;
  deliveryInstructions?: string;
}

export interface LocationSearchResult {
  address: string;
  coordinates: Coordinates;
  placeId?: string;
  displayName?: string;
}

export interface LocationState extends Location {
  isValid: boolean;
  lastUpdated?: string;
}

export interface GeofenceArea {
  center: Coordinates;
  radius: number; // in km
}

export interface DeliveryZone {
  name: string;
  area: GeofenceArea;
  active: boolean;
  charge?: number;
}

export interface LocationValidationResponse {
  isDeliverable: boolean;
  zone?: DeliveryZone;
  estimatedDeliveryTime?: string;
  deliveryCharge?: number;
  message?: string;
}
