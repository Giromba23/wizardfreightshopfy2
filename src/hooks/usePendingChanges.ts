import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingChange {
  id: string;
  rate_id: string;
  zone_id: string;
  zone_name: string;
  rate_name: string;
  proposed_rate_name: string | null;
  current_price: number;
  proposed_price: number;
  currency: string;
  proposed_by: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface ChangeLog {
  id: string;
  rate_id: string;
  zone_id: string;
  zone_name: string;
  rate_name: string;
  old_price: number;
  new_price: number;
  currency: string;
  action: 'proposed' | 'approved' | 'rejected' | 'applied';
  performed_by: string;
  notes: string | null;
  created_at: string;
}

export const usePendingChanges = () => {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingChanges = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_rate_changes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingChanges((data || []) as PendingChange[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading changes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChangeLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rate_change_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setChangeLogs((data || []) as ChangeLog[]);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  }, []);

  const proposeChange = async (
    rateId: string,
    zoneId: string,
    zoneName: string,
    rateName: string,
    currentPrice: number,
    proposedPrice: number,
    currency: string,
    proposedBy: string = 'agent',
    notes?: string,
    proposedRateName?: string
  ) => {
    try {
      // Insert pending change
      const { error: changeError } = await supabase
        .from('pending_rate_changes')
        .insert({
          rate_id: rateId,
          zone_id: zoneId,
          zone_name: zoneName,
          rate_name: rateName,
          proposed_rate_name: proposedRateName || rateName,
          current_price: currentPrice,
          proposed_price: proposedPrice,
          currency,
          proposed_by: proposedBy,
          notes
        });

      if (changeError) throw changeError;

      // Log the proposal
      await supabase.from('rate_change_logs').insert({
        rate_id: rateId,
        zone_id: zoneId,
        zone_name: zoneName,
        rate_name: rateName,
        old_price: currentPrice,
        new_price: proposedPrice,
        currency,
        action: 'proposed',
        performed_by: proposedBy,
        notes
      });

      await fetchPendingChanges();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error proposing change');
      throw err;
    }
  };

  const approveChange = async (changeId: string, reviewedBy: string = 'admin') => {
    try {
      const change = pendingChanges.find(c => c.id === changeId);
      if (!change) throw new Error('Change not found');

      const finalRateName = change.proposed_rate_name || change.rate_name;

      // Update status to approved
      const { error: updateError } = await supabase
        .from('pending_rate_changes')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy
        })
        .eq('id', changeId);

      if (updateError) throw updateError;

      // Apply to Shopify
      const { error: shopifyError } = await supabase.functions.invoke('shopify-freight', {
        body: {
          action: 'updateShippingRate',
          data: {
            deliveryProfileId: '',
            locationGroupId: '',
            zoneId: change.zone_id,
            methodId: change.rate_id,
            rate: {
              id: change.rate_id,
              name: finalRateName,
              price: change.proposed_price,
              currency: change.currency
            }
          }
        }
      });

      if (shopifyError) throw shopifyError;

      // Log approval
      await supabase.from('rate_change_logs').insert({
        rate_id: change.rate_id,
        zone_id: change.zone_id,
        zone_name: change.zone_name,
        rate_name: finalRateName,
        old_price: change.current_price,
        new_price: change.proposed_price,
        currency: change.currency,
        action: 'approved',
        performed_by: reviewedBy
      });

      // Log application to Shopify
      await supabase.from('rate_change_logs').insert({
        rate_id: change.rate_id,
        zone_id: change.zone_id,
        zone_name: change.zone_name,
        rate_name: change.rate_name,
        old_price: change.current_price,
        new_price: change.proposed_price,
        currency: change.currency,
        action: 'applied',
        performed_by: 'system'
      });

      await fetchPendingChanges();
      await fetchChangeLogs();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error approving change');
      throw err;
    }
  };

  const rejectChange = async (changeId: string, reviewedBy: string = 'admin', notes?: string) => {
    try {
      const change = pendingChanges.find(c => c.id === changeId);
      if (!change) throw new Error('Change not found');

      const { error: updateError } = await supabase
        .from('pending_rate_changes')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          notes: notes || change.notes
        })
        .eq('id', changeId);

      if (updateError) throw updateError;

      // Log rejection
      await supabase.from('rate_change_logs').insert({
        rate_id: change.rate_id,
        zone_id: change.zone_id,
        zone_name: change.zone_name,
        rate_name: change.rate_name,
        old_price: change.current_price,
        new_price: change.proposed_price,
        currency: change.currency,
        action: 'rejected',
        performed_by: reviewedBy,
        notes
      });

      await fetchPendingChanges();
      await fetchChangeLogs();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error rejecting change');
      throw err;
    }
  };

  const updateProposedPrice = async (changeId: string, newPrice: number, newRateName?: string) => {
    try {
      const updateData: { proposed_price: number; proposed_rate_name?: string } = { 
        proposed_price: newPrice 
      };
      if (newRateName !== undefined) {
        updateData.proposed_rate_name = newRateName;
      }

      const { error: updateError } = await supabase
        .from('pending_rate_changes')
        .update(updateData)
        .eq('id', changeId);

      if (updateError) throw updateError;

      await fetchPendingChanges();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating price');
      throw err;
    }
  };

  useEffect(() => {
    fetchPendingChanges();
    fetchChangeLogs();
  }, [fetchPendingChanges, fetchChangeLogs]);

  const pendingCount = pendingChanges.filter(c => c.status === 'pending').length;

  return {
    pendingChanges,
    changeLogs,
    pendingCount,
    loading,
    error,
    fetchPendingChanges,
    fetchChangeLogs,
    proposeChange,
    approveChange,
    rejectChange,
    updateProposedPrice
  };
};
