/**
 * Offer Type Definitions
 * Represents promotional offers and deals
 */

export type OfferType = 'percentage' | 'fixed' | 'freeShipping' | 'buyOne' | 'seasonal';
export type OfferStatus = 'active' | 'upcoming' | 'expired' | 'draft';

export interface Offer {
  _id?: string;
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  type: OfferType;
  code?: string;
  discount?: number;
  minAmount?: number;
  maxDiscount?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  status: OfferStatus;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  priority?: number;
  isActive?: boolean;
}

export interface OfferUI extends Offer {
  // UI-specific fields
  id: string; // Alias for _id
  image: string; // URL or local image
}

export interface OfferFilters {
  status?: OfferStatus;
  type?: OfferType;
  limit?: number;
  skip?: number;
}

export interface OfferValidationResponse {
  valid: boolean;
  discount?: number;
  message?: string;
}
