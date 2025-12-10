import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyRateRequest {
  rate: {
    origin: {
      country: string;
      postal_code: string;
      province: string;
      city: string;
      name: string | null;
      address1: string;
      address2: string;
      address3: string | null;
      phone: string | null;
      fax: string | null;
      email: string | null;
      address_type: string | null;
      company_name: string | null;
    };
    destination: {
      country: string;
      postal_code: string;
      province: string;
      city: string;
      name: string | null;
      address1: string;
      address2: string;
      address3: string | null;
      phone: string | null;
      fax: string | null;
      email: string | null;
      address_type: string | null;
      company_name: string | null;
    };
    items: Array<{
      name: string;
      sku: string;
      quantity: number;
      grams: number;
      price: number;
      vendor: string;
      requires_shipping: boolean;
      taxable: boolean;
      fulfillment_service: string;
      properties: Record<string, string> | null;
      product_id: number;
      variant_id: number;
    }>;
    currency: string;
    locale: string;
  };
}

interface ShippingRate {
  service_name: string;
  service_code: string;
  total_price: string; // in cents
  description: string;
  currency: string;
  min_delivery_date?: string;
  max_delivery_date?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ShopifyRateRequest = await req.json();
    console.log('Received rate request:', JSON.stringify(body, null, 2));

    const { rate } = body;
    const destinationCountry = rate.destination.country;
    
    // Calculate total weight in kg (Shopify sends grams)
    let totalWeightGrams = 0;
    let totalItems = 0;
    
    for (const item of rate.items) {
      totalWeightGrams += item.grams * item.quantity;
      totalItems += item.quantity;
    }
    
    const totalWeightKg = totalWeightGrams / 1000;
    console.log(`Destination: ${destinationCountry}, Total weight: ${totalWeightKg}kg, Items: ${totalItems}`);

    // Fetch base rates for the destination country
    const { data: baseRates, error: ratesError } = await supabase
      .from('carrier_base_rates')
      .select('*')
      .eq('country_code', destinationCountry)
      .eq('is_active', true);

    if (ratesError) {
      console.error('Error fetching rates:', ratesError);
      throw ratesError;
    }

    console.log(`Found ${baseRates?.length || 0} rates for country ${destinationCountry}`);

    if (!baseRates || baseRates.length === 0) {
      // No rates configured for this country, return empty
      console.log('No rates found for country, returning empty rates');
      return new Response(JSON.stringify({ rates: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate shipping rates
    const shippingRates: ShippingRate[] = [];
    
    for (const baseRate of baseRates) {
      // Calculate price: price_per_kg * weight, with minimum price
      let calculatedPrice = baseRate.price_per_kg * totalWeightKg;
      
      // Apply minimum price if calculated is lower
      if (calculatedPrice < baseRate.min_price) {
        calculatedPrice = baseRate.min_price;
      }
      
      // Convert to cents (Shopify expects price in cents as string)
      const priceInCents = Math.round(calculatedPrice * 100).toString();
      
      // Calculate delivery dates
      const today = new Date();
      const minDeliveryDate = new Date(today);
      minDeliveryDate.setDate(today.getDate() + (baseRate.estimated_days_min || 10));
      const maxDeliveryDate = new Date(today);
      maxDeliveryDate.setDate(today.getDate() + (baseRate.estimated_days_max || 65));
      
      shippingRates.push({
        service_name: baseRate.service_name,
        service_code: `${baseRate.country_code}_${baseRate.id}`,
        total_price: priceInCents,
        description: `${totalWeightKg.toFixed(2)}kg - ${baseRate.estimated_days_min || 10}-${baseRate.estimated_days_max || 65} days`,
        currency: baseRate.currency,
        min_delivery_date: minDeliveryDate.toISOString().split('T')[0],
        max_delivery_date: maxDeliveryDate.toISOString().split('T')[0],
      });
      
      console.log(`Rate calculated: ${baseRate.service_name} = ${calculatedPrice} ${baseRate.currency}`);
    }

    console.log('Returning rates:', JSON.stringify(shippingRates, null, 2));

    return new Response(JSON.stringify({ rates: shippingRates }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in carrier-service:', error);
    return new Response(JSON.stringify({ 
      rates: [],
      error: error.message 
    }), {
      status: 200, // Shopify expects 200 even on errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
