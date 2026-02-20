import { create } from 'zustand';

export type SelectedLocation = {
  address: string;
  deliveryInstructions: string;
  latitude: number;
  longitude: number;
};

type LocationState = {
  selectedLocation: SelectedLocation;
  setSelectedLocation: (location: SelectedLocation) => void;
};

const defaultLocation: SelectedLocation = {
  address: 'Select your delivery location',
  deliveryInstructions: '',
  latitude: 30.7333,
  longitude: 76.7794,
};

const useLocationStore = create<LocationState>((set) => ({
  selectedLocation: defaultLocation,
  setSelectedLocation: (location) => set({ selectedLocation: location }),
}));

export default useLocationStore;
