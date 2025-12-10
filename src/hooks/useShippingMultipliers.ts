import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ShippingMultiplier } from "@/types/shipping";

export const useShippingMultipliers = () => {
  const [multipliers, setMultipliers] = useState<ShippingMultiplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMultipliers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('shipping_multipliers')
        .select('*')
        .order('multiplier', { ascending: true });

      if (error) throw error;
      setMultipliers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar multiplicadores');
      console.error('Error fetching multipliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMultiplier = async (multiplier: Omit<ShippingMultiplier, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('shipping_multipliers')
        .insert([multiplier])
        .select()
        .single();

      if (error) throw error;
      setMultipliers(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding multiplier:', err);
      throw err;
    }
  };

  const updateMultiplier = async (id: string, updates: Partial<ShippingMultiplier>) => {
    try {
      const { data, error } = await supabase
        .from('shipping_multipliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setMultipliers(prev => prev.map(m => m.id === id ? data : m));
      return data;
    } catch (err) {
      console.error('Error updating multiplier:', err);
      throw err;
    }
  };

  const deleteMultiplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shipping_multipliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMultipliers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting multiplier:', err);
      throw err;
    }
  };

  const calculatePrice = (basePrice: number, multiplierId: string): number => {
    const multiplier = multipliers.find(m => m.id === multiplierId);
    if (!multiplier) return basePrice;
    return Math.round(basePrice * multiplier.multiplier * 100) / 100;
  };

  useEffect(() => {
    fetchMultipliers();
  }, []);

  return {
    multipliers,
    loading,
    error,
    fetchMultipliers,
    addMultiplier,
    updateMultiplier,
    deleteMultiplier,
    calculatePrice
  };
};
