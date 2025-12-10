import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, DollarSign, Check, Gift, Minus, Plus, Percent as PercentIcon } from "lucide-react";
import type { ShippingZone, ShippingRate, ShippingMultiplier } from "@/types/shipping";
import { BIKE_CATEGORIES } from "@/types/shipping";

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: ShippingZone[];
  multipliers: ShippingMultiplier[];
  onBulkUpdate: (updates: BulkUpdate[]) => Promise<void>;
}

export interface BulkUpdate {
  zoneId: string;
  rateId: string;
  newPrice: number;
}

type OperationType = 'fixed' | 'add' | 'subtract' | 'multiply' | 'percentage' | 'free';

export const BulkEditModal = ({
  isOpen,
  onClose,
  zones,
  multipliers,
  onBulkUpdate,
}: BulkEditModalProps) => {
  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  
  // Operation
  const [operationType, setOperationType] = useState<OperationType>('subtract');
  const [operationValue, setOperationValue] = useState<string>('');
  const [selectedMultiplier, setSelectedMultiplier] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('filter');

  // Get unique countries from all zones
  const allCountries = useMemo(() => {
    const countries = new Set<string>();
    zones.forEach(zone => zone.countries.forEach(c => countries.add(c)));
    return Array.from(countries).sort();
  }, [zones]);

  // Get unique categories from all rates
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    zones.forEach(zone => 
      zone.rates.forEach(rate => {
        if (rate.category) categories.add(rate.category);
      })
    );
    return Array.from(categories);
  }, [zones]);

  // Filter rates based on selections
  const filteredRates = useMemo(() => {
    const results: { zone: ShippingZone; rate: ShippingRate }[] = [];
    
    zones.forEach(zone => {
      // Check zone filter
      if (selectedZones.length > 0 && !selectedZones.includes(zone.id)) return;
      
      // Check country filter
      if (selectedCountries.length > 0) {
        const hasMatchingCountry = zone.countries.some(c => selectedCountries.includes(c));
        if (!hasMatchingCountry) return;
      }
      
      zone.rates.forEach(rate => {
        // Check category filter
        if (selectedCategories.length > 0) {
          if (!rate.category || !selectedCategories.includes(rate.category)) return;
        }
        
        results.push({ zone, rate });
      });
    });
    
    return results;
  }, [zones, selectedCategories, selectedCountries, selectedZones]);

  // Calculate new price based on operation
  const calculateNewPrice = (currentPrice: number): number => {
    if (operationType === 'free') return 0;
    
    const value = parseFloat(operationValue) || 0;
    
    switch (operationType) {
      case 'fixed':
        return value;
      case 'add':
        return currentPrice + value;
      case 'subtract':
        return Math.max(0, currentPrice - value);
      case 'multiply':
        return currentPrice * value;
      case 'percentage':
        // Negative value = discount, positive = increase
        return currentPrice * (1 + value / 100);
      default:
        return currentPrice;
    }
  };

  // Calculate with multiplier
  const calculateWithMultiplier = (currentPrice: number): number => {
    if (!selectedMultiplier || selectedMultiplier === 'none') return currentPrice;
    const multiplier = multipliers.find(m => m.id === selectedMultiplier);
    if (!multiplier) return currentPrice;
    return currentPrice * multiplier.multiplier;
  };

  // Get preview of changes
  const previewChanges = useMemo(() => {
    if (filteredRates.length === 0) return [];
    if (operationType !== 'free' && !operationValue && (!selectedMultiplier || selectedMultiplier === 'none')) return [];
    
    return filteredRates.map(({ zone, rate }) => {
      let newPrice = calculateNewPrice(rate.price);
      if (selectedMultiplier && selectedMultiplier !== 'none') {
        newPrice = calculateWithMultiplier(newPrice);
      }
      newPrice = Math.round(newPrice * 100) / 100;
      const diff = newPrice - rate.price;
      
      return { zone, rate, newPrice, diff };
    });
  }, [filteredRates, operationType, operationValue, selectedMultiplier]);

  // Apply bulk update
  const handleApply = async () => {
    if (previewChanges.length === 0) return;
    
    setLoading(true);
    try {
      const updates: BulkUpdate[] = previewChanges.map(({ zone, rate, newPrice }) => ({
        zoneId: zone.id,
        rateId: rate.id,
        newPrice,
      }));
      
      await onBulkUpdate(updates);
      resetAll();
      onClose();
    } catch (error) {
      console.error('Bulk update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedCountries([]);
    setSelectedZones([]);
  };

  const resetAll = () => {
    resetFilters();
    setOperationType('subtract');
    setOperationValue('');
    setSelectedMultiplier('');
  };

  // Quick operation buttons
  const setQuickOperation = (type: OperationType, value?: string) => {
    setOperationType(type);
    if (value !== undefined) setOperationValue(value);
    setActiveTab('preview');
  };

  const hasFilters = selectedCategories.length > 0 || selectedCountries.length > 0 || selectedZones.length > 0;
  const hasOperation = operationType === 'free' || operationValue || (selectedMultiplier && selectedMultiplier !== 'none');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Bulk Edit Shipping Rates
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="filter">
              <Filter className="h-4 w-4 mr-2" />
              Filter ({filteredRates.length})
            </TabsTrigger>
            <TabsTrigger value="operation">
              <DollarSign className="h-4 w-4 mr-2" />
              Operation
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Check className="h-4 w-4 mr-2" />
              Preview ({previewChanges.length})
            </TabsTrigger>
          </TabsList>

          {/* Filter Tab */}
          <TabsContent value="filter" className="flex-1 overflow-hidden">
            <div className="space-y-4">
              {/* Category Filter */}
              <div>
                <Label className="text-sm font-medium">Bike Category</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {BIKE_CATEGORIES.map(category => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => {
                        if (selectedCategories.includes(category)) {
                          setSelectedCategories(prev => prev.filter(c => c !== category));
                        } else {
                          setSelectedCategories(prev => [...prev, category]);
                        }
                      }}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Country Filter */}
              <div>
                <Label className="text-sm font-medium">Countries</Label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  {allCountries.map(country => (
                    <Badge
                      key={country}
                      variant={selectedCountries.includes(country) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => {
                        if (selectedCountries.includes(country)) {
                          setSelectedCountries(prev => prev.filter(c => c !== country));
                        } else {
                          setSelectedCountries(prev => [...prev, country]);
                        }
                      }}
                    >
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Zone Filter */}
              <div>
                <Label className="text-sm font-medium">Zones</Label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto">
                  {zones.map(zone => (
                    <Badge
                      key={zone.id}
                      variant={selectedZones.includes(zone.id) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => {
                        if (selectedZones.includes(zone.id)) {
                          setSelectedZones(prev => prev.filter(z => z !== zone.id));
                        } else {
                          setSelectedZones(prev => [...prev, zone.id]);
                        }
                      }}
                    >
                      {zone.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {filteredRates.length} rates matching filters
                </p>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>

              {/* Quick Actions */}
              {hasFilters && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <Label className="text-sm font-medium mb-3 block">Quick Actions</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setQuickOperation('free')}
                      className="bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                    >
                      <Gift className="h-4 w-4 mr-1" />
                      Free Shipping
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setOperationType('subtract'); setActiveTab('operation'); }}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Discount ($)
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setOperationType('percentage'); setOperationValue('-10'); setActiveTab('operation'); }}
                    >
                      <PercentIcon className="h-4 w-4 mr-1" />
                      -10% Discount
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setOperationType('add'); setActiveTab('operation'); }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Fee ($)
                    </Button>
                  </div>
                </Card>
              )}

              {/* Filtered Rates Preview */}
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredRates.slice(0, 50).map(({ zone, rate }) => (
                    <div
                      key={rate.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate">{rate.name}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          ({zone.name})
                        </span>
                      </div>
                      {rate.category && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {rate.category}
                        </Badge>
                      )}
                      <span className="font-medium shrink-0">
                        ${rate.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {filteredRates.length > 50 && (
                    <p className="text-center text-muted-foreground text-sm py-2">
                      +{filteredRates.length - 50} more rates...
                    </p>
                  )}
                  {filteredRates.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No rates match the current filters. Select categories, countries, or zones above.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Operation Tab */}
          <TabsContent value="operation" className="space-y-4">
            <Card className="p-4">
              <Label className="text-sm font-medium">Operation Type</Label>
              <Select value={operationType} onValueChange={(v) => setOperationType(v as OperationType)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">🎁 Free Shipping (Set to $0)</SelectItem>
                  <SelectItem value="fixed">Set Fixed Price ($)</SelectItem>
                  <SelectItem value="subtract">Subtract Value ($)</SelectItem>
                  <SelectItem value="add">Add Value ($)</SelectItem>
                  <SelectItem value="multiply">Multiply By</SelectItem>
                  <SelectItem value="percentage">Percentage Adjustment (%)</SelectItem>
                </SelectContent>
              </Select>

              {operationType !== 'free' && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">
                    {operationType === 'fixed' && 'New Price ($)'}
                    {operationType === 'add' && 'Amount to Add ($)'}
                    {operationType === 'subtract' && 'Amount to Subtract ($)'}
                    {operationType === 'multiply' && 'Multiplier'}
                    {operationType === 'percentage' && 'Percentage (%)'}
                  </Label>
                  <Input
                    type="number"
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    placeholder={operationType === 'percentage' ? 'e.g. -10 for 10% discount' : 'Value'}
                    className="mt-2"
                  />
                  {operationType === 'percentage' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Use negative values for discounts (e.g. -10 = 10% off)
                    </p>
                  )}
                  {operationType === 'subtract' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Prices will not go below $0
                    </p>
                  )}
                </div>
              )}
            </Card>

            {multipliers.filter(m => m.is_active).length > 0 && (
              <Card className="p-4">
                <Label className="text-sm font-medium">Apply Pre-defined Multiplier (Optional)</Label>
                <Select value={selectedMultiplier} onValueChange={setSelectedMultiplier}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select multiplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {multipliers.filter(m => m.is_active).map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} (×{m.multiplier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Multipliers are applied AFTER the main operation
                </p>
              </Card>
            )}

            {hasOperation && (
              <Button 
                className="w-full" 
                onClick={() => setActiveTab('preview')}
              >
                Preview Changes ({filteredRates.length} rates)
              </Button>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            {previewChanges.length > 0 ? (
              <>
                <div className="mb-3 p-3 bg-primary/10 rounded-md">
                  <p className="text-sm font-medium">
                    Operation: {operationType === 'free' ? 'Free Shipping' : 
                      operationType === 'fixed' ? `Set to $${operationValue}` :
                      operationType === 'add' ? `Add $${operationValue}` :
                      operationType === 'subtract' ? `Subtract $${operationValue}` :
                      operationType === 'multiply' ? `Multiply by ${operationValue}` :
                      `${operationValue}% adjustment`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Applying to {previewChanges.length} rates
                  </p>
                </div>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2">
                    {previewChanges.map(({ zone, rate, newPrice, diff }) => (
                      <Card key={rate.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{rate.name}</p>
                            <p className="text-sm text-muted-foreground">{zone.name}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground line-through">
                                ${rate.price.toFixed(2)}
                              </span>
                              <span className="font-bold text-lg">
                                {newPrice === 0 ? 'FREE' : `$${newPrice.toFixed(2)}`}
                              </span>
                            </div>
                            <Badge variant={diff > 0 ? "destructive" : diff < 0 ? "default" : "secondary"}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <p className="text-muted-foreground mb-4">
                  {!hasFilters ? 'Start by selecting filters in the "Filter" tab' :
                   !hasOperation ? 'Configure an operation in the "Operation" tab' :
                   'No changes to preview'}
                </p>
                <div className="flex gap-2">
                  {!hasFilters && (
                    <Button variant="outline" onClick={() => setActiveTab('filter')}>
                      Go to Filters
                    </Button>
                  )}
                  {hasFilters && !hasOperation && (
                    <Button variant="outline" onClick={() => setActiveTab('operation')}>
                      Go to Operation
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={previewChanges.length === 0 || loading}
          >
            {loading ? 'Applying...' : `Apply ${previewChanges.length} Changes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
