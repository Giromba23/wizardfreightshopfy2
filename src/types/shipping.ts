export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  rates: ShippingRate[];
}

export interface ShippingRate {
  id: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
  minWeight?: number;
  maxWeight?: number;
  estimatedDays: string;
  category?: string;
}

export interface ShippingMultiplier {
  id: string;
  name: string;
  description?: string;
  multiplier: number;
  base_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const BIKE_CATEGORIES = [
  'E-Bike',
  'Road Bike',
  'Mountain Bike',
  'Gravel Bike',
  'City Bike',
  'Kids Bike',
  'Accessories',
  'Parts',
  'Wheels',
  'Other'
] as const;

export type BikeCategory = typeof BIKE_CATEGORIES[number];
