import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Calculator, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CarrierRate {
  id: string;
  country_code: string;
  country_name: string;
  zone_id: string | null;
  price_per_kg: number;
  min_price: number;
  currency: string;
  estimated_days_min: number;
  estimated_days_max: number;
  service_name: string;
  is_active: boolean;
}

export function CarrierRatesManager() {
  const [rates, setRates] = useState<CarrierRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<CarrierRate | null>(null);
  const [testWeight, setTestWeight] = useState<number>(18);
  
  const [formData, setFormData] = useState({
    country_code: '',
    country_name: '',
    price_per_kg: 0,
    min_price: 0,
    currency: 'USD',
    estimated_days_min: 10,
    estimated_days_max: 65,
    service_name: 'Standard Shipping',
  });

  const fetchRates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('carrier_base_rates')
      .select('*')
      .order('country_name');
    
    if (error) {
      toast.error('Failed to load rates');
      console.error(error);
    } else {
      setRates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleSave = async () => {
    if (!formData.country_code || !formData.country_name) {
      toast.error('Country code and name are required');
      return;
    }

    if (editingRate) {
      const { error } = await supabase
        .from('carrier_base_rates')
        .update(formData)
        .eq('id', editingRate.id);
      
      if (error) {
        toast.error('Failed to update rate');
        console.error(error);
      } else {
        toast.success('Rate updated');
        fetchRates();
      }
    } else {
      const { error } = await supabase
        .from('carrier_base_rates')
        .insert(formData);
      
      if (error) {
        toast.error('Failed to create rate');
        console.error(error);
      } else {
        toast.success('Rate created');
        fetchRates();
      }
    }
    
    setIsAddDialogOpen(false);
    setEditingRate(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;
    
    const { error } = await supabase
      .from('carrier_base_rates')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete rate');
      console.error(error);
    } else {
      toast.success('Rate deleted');
      fetchRates();
    }
  };

  const handleToggleActive = async (rate: CarrierRate) => {
    const { error } = await supabase
      .from('carrier_base_rates')
      .update({ is_active: !rate.is_active })
      .eq('id', rate.id);
    
    if (error) {
      toast.error('Failed to update rate');
    } else {
      fetchRates();
    }
  };

  const handleEdit = (rate: CarrierRate) => {
    setEditingRate(rate);
    setFormData({
      country_code: rate.country_code,
      country_name: rate.country_name,
      price_per_kg: rate.price_per_kg,
      min_price: rate.min_price,
      currency: rate.currency,
      estimated_days_min: rate.estimated_days_min,
      estimated_days_max: rate.estimated_days_max,
      service_name: rate.service_name,
    });
    setIsAddDialogOpen(true);
  };

  const handleDuplicate = (rate: CarrierRate) => {
    setEditingRate(null);
    setFormData({
      country_code: '',
      country_name: '',
      price_per_kg: rate.price_per_kg,
      min_price: rate.min_price,
      currency: rate.currency,
      estimated_days_min: rate.estimated_days_min,
      estimated_days_max: rate.estimated_days_max,
      service_name: rate.service_name,
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      country_code: '',
      country_name: '',
      price_per_kg: 0,
      min_price: 0,
      currency: 'USD',
      estimated_days_min: 10,
      estimated_days_max: 65,
      service_name: 'Standard Shipping',
    });
  };

  const calculatePrice = (rate: CarrierRate, weight: number) => {
    const calculated = rate.price_per_kg * weight;
    return Math.max(calculated, rate.min_price);
  };

  const endpointUrl = `https://frrvzeoupdkfekbymlxu.supabase.co/functions/v1/carrier-service`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Carrier Service API</CardTitle>
          <CardDescription>
            Configure real-time shipping rates per country based on weight (price per kg).
            Shopify will call this endpoint during checkout to calculate shipping.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium">Carrier Service Endpoint URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 p-2 bg-background rounded text-xs break-all">
                {endpointUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(endpointUrl);
                  toast.success('URL copied to clipboard');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use this URL when creating your Carrier Service in Shopify Admin → Settings → Shipping → Carrier Services
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Test Weight (kg):</Label>
              <Input
                type="number"
                value={testWeight}
                onChange={(e) => setTestWeight(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingRate(null); resetForm(); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Country Rate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingRate ? 'Edit Rate' : 'Add Country Rate'}</DialogTitle>
                  <DialogDescription>
                    Configure shipping rate per kg for a country.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Country Code (ISO)</Label>
                      <Input
                        placeholder="BR"
                        value={formData.country_code}
                        onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country Name</Label>
                      <Input
                        placeholder="Brazil"
                        value={formData.country_name}
                        onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price per KG</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price_per_kg}
                        onChange={(e) => setFormData({ ...formData, price_per_kg: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.min_price}
                        onChange={(e) => setFormData({ ...formData, min_price: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Input
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Days</Label>
                      <Input
                        type="number"
                        value={formData.estimated_days_min}
                        onChange={(e) => setFormData({ ...formData, estimated_days_min: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Days</Label>
                      <Input
                        type="number"
                        value={formData.estimated_days_max}
                        onChange={(e) => setFormData({ ...formData, estimated_days_max: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Name</Label>
                    <Input
                      placeholder="Standard Shipping"
                      value={formData.service_name}
                      onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave}>{editingRate ? 'Update' : 'Create'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Price/kg</TableHead>
                <TableHead>Min Price</TableHead>
                <TableHead className="flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  {testWeight}kg
                </TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No rates configured. Add your first country rate above.
                  </TableCell>
                </TableRow>
              ) : rates.map((rate) => (
                <TableRow key={rate.id} className={!rate.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{rate.country_name}</TableCell>
                  <TableCell>{rate.country_code}</TableCell>
                  <TableCell>${rate.price_per_kg.toFixed(2)}</TableCell>
                  <TableCell>${rate.min_price.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    ${calculatePrice(rate, testWeight).toFixed(2)}
                  </TableCell>
                  <TableCell>{rate.estimated_days_min}-{rate.estimated_days_max}</TableCell>
                  <TableCell>{rate.service_name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={rate.is_active}
                      onCheckedChange={() => handleToggleActive(rate)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(rate)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(rate)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rate.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
