import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ShippingZone, ShippingRate } from "@/types/shipping";

interface RateExtras {
  rate_id: string;
  zone_id: string;
  min_weight?: number;
  max_weight?: number;
  estimated_days?: string;
  description?: string;
  category?: string;
}

// Bike weight constants
const BIKE_WEIGHTS = {
  ROAD_BIKE: 15,
  MOUNTAIN_BIKE: 18,
  E_BIKE: 25,
};

// Auto-classify bike category based on weight range
const classifyByWeightRange = (minWeight: number | undefined, maxWeight: number | undefined): string | undefined => {
  const min = minWeight || 0;
  const max = maxWeight || min;
  
  if (min === 0 && max === 0) return undefined;
  
  // Single weight (min === max) - exact match
  if (min === max || (min > 0 && max === 0) || (min === 0 && max > 0)) {
    const weight = max || min;
    return classifySingleWeight(weight);
  }
  
  // Weight range - check which bike types fall within the range
  const categories: string[] = [];
  
  // Check if Road Bike (15kg) falls in range
  if (min <= BIKE_WEIGHTS.ROAD_BIKE && max >= BIKE_WEIGHTS.ROAD_BIKE) {
    categories.push('Road Bike');
  }
  
  // Check if Mountain Bike (18kg) falls in range
  if (min <= BIKE_WEIGHTS.MOUNTAIN_BIKE && max >= BIKE_WEIGHTS.MOUNTAIN_BIKE) {
    categories.push('Mountain Bike');
  }
  
  // Check if E-Bike (25kg) falls in range
  if (min <= BIKE_WEIGHTS.E_BIKE && max >= BIKE_WEIGHTS.E_BIKE) {
    categories.push('E-Bike');
  }
  
  if (categories.length === 0) return undefined;
  return categories.join(' / ');
};

// Classify a single exact weight
const classifySingleWeight = (weight: number): string | undefined => {
  if (!weight || weight === 0) return undefined;
  
  // Exact matches
  if (weight === BIKE_WEIGHTS.ROAD_BIKE) return 'Road Bike';
  if (weight === BIKE_WEIGHTS.MOUNTAIN_BIKE) return 'Mountain Bike';
  if (weight === BIKE_WEIGHTS.E_BIKE) return 'E-Bike';
  
  // Multiple bikes of same type
  if (weight % BIKE_WEIGHTS.E_BIKE === 0) return 'E-Bike';
  if (weight % BIKE_WEIGHTS.MOUNTAIN_BIKE === 0) return 'Mountain Bike';
  if (weight % BIKE_WEIGHTS.ROAD_BIKE === 0) return 'Road Bike';
  
  // Common mixed combinations
  if (weight === 33) return 'Road Bike + Mountain Bike';  // 15 + 18
  if (weight === 40) return 'E-Bike + Road Bike';         // 25 + 15
  if (weight === 43) return 'E-Bike + Mountain Bike';     // 25 + 18
  
  return undefined;
};

// Save rate extras to Supabase
const saveRateExtras = async (rateId: string, zoneId: string, data: Partial<ShippingRate>) => {
  const { error } = await supabase
    .from('shopify_rate_extras')
    .upsert({
      rate_id: rateId,
      zone_id: zoneId,
      min_weight: data.minWeight,
      max_weight: data.maxWeight,
      estimated_days: data.estimatedDays,
      description: data.description,
      category: data.category,
    }, {
      onConflict: 'rate_id,zone_id'
    });
  
  if (error) {
    console.error('Error saving rate extras:', error);
  }
};

// Get all rate extras from Supabase
const getAllRateExtras = async (): Promise<Map<string, RateExtras>> => {
  const { data, error } = await supabase
    .from('shopify_rate_extras')
    .select('*');
  
  if (error) {
    console.error('Error fetching rate extras:', error);
    return new Map();
  }
  
  const extrasMap = new Map<string, RateExtras>();
  data?.forEach(item => {
    extrasMap.set(item.rate_id, item);
  });
  
  return extrasMap;
};

// Merge Shopify data with Supabase extras
const mergeWithExtras = (rate: ShippingRate, extras: RateExtras | undefined): ShippingRate => {
  const minWeight = extras?.min_weight ?? rate.minWeight;
  const maxWeight = extras?.max_weight ?? rate.maxWeight;
  const autoCategory = classifyByWeightRange(minWeight, maxWeight);
  
  if (!extras) {
    return {
      ...rate,
      category: autoCategory ?? rate.category,
    };
  }
  
  return {
    ...rate,
    minWeight: extras.min_weight ?? rate.minWeight,
    maxWeight: extras.max_weight ?? rate.maxWeight,
    estimatedDays: extras.estimated_days ?? rate.estimatedDays,
    description: extras.description ?? rate.description,
    category: extras.category ?? autoCategory ?? rate.category,
  };
};

export const useShopifyFreight = () => {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch both Shopify data and local extras in parallel
      const [shopifyResponse, extrasMap] = await Promise.all([
        supabase.functions.invoke('shopify-freight', {
          body: { action: 'getDeliveryProfiles' }
        }),
        getAllRateExtras()
      ]);

      if (shopifyResponse.error) throw shopifyResponse.error;
      
      // Merge Shopify data with local extras
      const zonesWithExtras = (shopifyResponse.data.zones || []).map((zone: ShippingZone) => ({
        ...zone,
        rates: zone.rates.map(rate => mergeWithExtras(rate, extrasMap.get(rate.id)))
      }));
      
      setZones(zonesWithExtras);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar zonas');
      console.error('Error fetching zones:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRate = async (
    zone: ShippingZone,
    updatedRate: ShippingRate
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Save extras to Supabase (category, weight, estimated days, description)
      await saveRateExtras(updatedRate.id, zone.id, {
        minWeight: updatedRate.minWeight,
        maxWeight: updatedRate.maxWeight,
        estimatedDays: updatedRate.estimatedDays,
        description: updatedRate.description,
        category: updatedRate.category,
      });

      // Update Shopify (only price and name)
      const { data, error } = await supabase.functions.invoke('shopify-freight', {
        body: {
          action: 'updateShippingRate',
          data: {
            deliveryProfileId: '',
            locationGroupId: '',
            zoneId: zone.id,
            methodId: updatedRate.id,
            rate: updatedRate
          }
        }
      });

      if (error) throw error;
      
      // Update local state
      setZones(prevZones =>
        prevZones.map(zoneItem =>
          zoneItem.id === zone.id
            ? {
                ...zoneItem,
                rates: zoneItem.rates.map(rate =>
                  rate.id === updatedRate.id ? updatedRate : rate
                )
              }
            : zoneItem
        )
      );

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar taxa');
      console.error('Error updating rate:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdateRates = async (
    updates: { zoneId: string; rateId: string; newPrice: number }[]
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Update each rate
      for (const update of updates) {
        const zone = zones.find(z => z.id === update.zoneId);
        const rate = zone?.rates.find(r => r.id === update.rateId);
        
        if (!zone || !rate) continue;
        
        const updatedRate = { ...rate, price: update.newPrice };
        
        // Update Shopify
        await supabase.functions.invoke('shopify-freight', {
          body: {
            action: 'updateShippingRate',
            data: {
              deliveryProfileId: '',
              locationGroupId: '',
              zoneId: zone.id,
              methodId: rate.id,
              rate: updatedRate
            }
          }
        });
      }
      
      // Refresh all data
      await fetchZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar taxas em bulk');
      console.error('Error bulk updating rates:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const createRate = async (
    zoneId: string,
    rate: {
      name: string;
      price: number;
      currency: string;
      description?: string;
      minWeight?: number;
      maxWeight?: number;
    }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('shopify-freight', {
        body: {
          action: 'createShippingRate',
          data: {
            zoneId,
            rate
          }
        }
      });

      if (error) throw error;
      
      // Refresh zones to get the new rate
      await fetchZones();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating rate');
      console.error('Error creating rate:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRate = async (zoneId: string, methodId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('shopify-freight', {
        body: {
          action: 'deleteShippingRate',
          data: {
            zoneId,
            methodId
          }
        }
      });

      if (error) throw error;
      
      // Refresh zones to reflect deletion
      await fetchZones();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting rate');
      console.error('Error deleting rate:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    zones,
    loading,
    error,
    fetchZones,
    updateRate,
    bulkUpdateRates,
    createRate,
    deleteRate
  };
};
