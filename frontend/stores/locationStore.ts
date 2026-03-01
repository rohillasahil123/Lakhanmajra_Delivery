import { create } from 'zustand';

export const DEFAULT_LOCATION_ADDRESS = 'Lakhanmajra, Rohtak, Haryana';
export const DEFAULT_LOCATION_COORDS = {
  latitude: 28.8964,
  longitude: 76.1739,
};

export type SelectedLocation = {
  address: string;
  deliveryInstructions: string;
  latitude: number;
  longitude: number;
};

type LocationState = {
  selectedLocation: SelectedLocation;
  setSelectedLocation: (location: SelectedLocation) => void;
  resetToDefaultLocation: () => void;
};

const defaultLocation: SelectedLocation = {
  address: DEFAULT_LOCATION_ADDRESS,
  deliveryInstructions: '',
  latitude: DEFAULT_LOCATION_COORDS.latitude,
  longitude: DEFAULT_LOCATION_COORDS.longitude,
};

const useLocationStore = create<LocationState>((set) => ({
  selectedLocation: defaultLocation,
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  resetToDefaultLocation: () => set({ selectedLocation: defaultLocation }),
}));

export default useLocationStore;
