import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Loader2, Check, Package, Bike, Trash2, AlertTriangle } from "lucide-react";
import type { ShippingZone, ShippingRate } from "@/types/shipping";

interface RateCombinationGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: ShippingZone | null;
  onCreateRate: (zoneId: string, rate: {
    name: string;
    price: number;
    currency: string;
    description?: string;
    minWeight?: number;
    maxWeight?: number;
  }) => Promise<void>;
  onDeleteRate?: (zoneId: string, rateId: string) => Promise<void>;
}

interface BikeType {
  id: string;
  name: string;
  weight: number;
  price: number;
  enabled: boolean;
}

interface GeneratedCombination {
  id: string;
  name: string;
  description: string;
  totalPrice: number;
  totalWeight: number;
  bikeCount: number;
  breakdown: { type: string; count: number; weight: number; price: number }[];
  selected: boolean;
}

// Default bike types with standard weights
const DEFAULT_BIKE_TYPES: BikeType[] = [
  { id: 'ebike', name: 'E-Bike', weight: 25, price: 0, enabled: true },
  { id: 'road', name: 'Road Bike', weight: 15, price: 0, enabled: true },
  { id: 'mountain', name: 'Mountain Bike', weight: 18, price: 0, enabled: true },
];

// Generate all combinations with repetition for enabled bike types
function generateAllCombinations(
  bikeTypes: BikeType[],
  maxBikes: number,
  customName: string
): GeneratedCombination[] {
  const enabledTypes = bikeTypes.filter(t => t.enabled && t.price > 0);
  if (enabledTypes.length === 0) return [];

  const results: GeneratedCombination[] = [];

  // Generate combinations for each total bike count (1 to maxBikes)
  // Starting from 1 ensures single-bike purchases have matching rates
  for (let totalBikes = 1; totalBikes <= maxBikes; totalBikes++) {
    // Generate all ways to distribute totalBikes among n bike types
    generateDistributions(enabledTypes, totalBikes, [], 0, results, customName);
  }

  return results;
}

function generateDistributions(
  types: BikeType[],
  remaining: number,
  current: { typeIndex: number; count: number }[],
  startIndex: number,
  results: GeneratedCombination[],
  customName: string
) {
  if (remaining === 0 && current.length > 0) {
    // Build the combination
    const breakdown = current.map(({ typeIndex, count }) => ({
      type: types[typeIndex].name,
      count,
      weight: types[typeIndex].weight * count,
      price: types[typeIndex].price * count,
    }));

    const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0);
    const totalPrice = breakdown.reduce((sum, b) => sum + b.price, 0);
    const bikeCount = breakdown.reduce((sum, b) => sum + b.count, 0);

    // Create description with bike types
    const descParts = breakdown.map(b => `${b.count}x ${b.type}`);
    const description = `${descParts.join(" + ")} | Total: ${totalWeight}kg`;

    // Create name - use custom name if provided, otherwise auto-generate
    let name: string;
    if (customName.trim()) {
      name = `${customName} | ${descParts.join(" + ")}`;
    } else {
      const nameParts = current.map(({ typeIndex, count }) => {
        const type = types[typeIndex];
        return `${count}x ${type.weight}kg`;
      });
      const bikeWord = bikeCount === 1 ? 'Bike' : 'Bikes';
      name = `${bikeCount} ${bikeWord} (${totalWeight}kg): ${nameParts.join(" + ")}`;
    }

    results.push({
      id: `combo-${bikeCount}-${current.map(c => `${c.typeIndex}-${c.count}`).join("-")}`,
      name,
      description,
      totalPrice,
      totalWeight,
      bikeCount,
      breakdown,
      selected: true,
    });
    return;
  }

  for (let i = startIndex; i < types.length; i++) {
    for (let count = 1; count <= remaining; count++) {
      current.push({ typeIndex: i, count });
      generateDistributions(types, remaining - count, current, i + 1, results, customName);
      current.pop();
    }
  }
}

export function RateCombinationGenerator({
  open,
  onOpenChange,
  zone,
  onCreateRate,
  onDeleteRate,
}: RateCombinationGeneratorProps) {
  const [activeTab, setActiveTab] = useState<"generate" | "delete">("generate");
  const [step, setStep] = useState<"config" | "review" | "creating">("config");
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>(DEFAULT_BIKE_TYPES);
  const [maxBikes, setMaxBikes] = useState(5);
  const [combinations, setCombinations] = useState<GeneratedCombination[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [customRateName, setCustomRateName] = useState("");
  
  // Bulk delete state
  const [selectedRatesForDelete, setSelectedRatesForDelete] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [deleteStep, setDeleteStep] = useState<"select" | "deleting">("select");

  // Reset when zone changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && zone) {
      setBikeTypes(DEFAULT_BIKE_TYPES.map(t => ({ ...t, price: 0 })));
      setCurrency(zone.rates[0]?.currency || "USD");
      setCustomRateName("");
      setCombinations([]);
      setStep("config");
      setSelectedRatesForDelete(new Set());
      setDeleteStep("select");
      setActiveTab("generate");
    }
    onOpenChange(isOpen);
  };

  const updateBikeType = (id: string, field: keyof BikeType, value: number | boolean) => {
    setBikeTypes(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const handleGenerateCombinations = () => {
    const combos = generateAllCombinations(bikeTypes, maxBikes, customRateName);
    setCombinations(combos);
    setStep("review");
  };

  const toggleCombination = (id: string) => {
    setCombinations(prev =>
      prev.map(c => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const selectAllCombinations = () => {
    setCombinations(prev => prev.map(c => ({ ...c, selected: true })));
  };

  const deselectAllCombinations = () => {
    setCombinations(prev => prev.map(c => ({ ...c, selected: false })));
  };

  const selectByBikeCount = (count: number) => {
    setCombinations(prev =>
      prev.map(c => ({ ...c, selected: c.bikeCount === count }))
    );
  };

  const selectedCombinations = combinations.filter(c => c.selected);

  const handleCreateRates = async () => {
    if (!zone || selectedCombinations.length === 0) return;

    setCreating(true);
    setCreatedCount(0);
    setStep("creating");

    for (let i = 0; i < selectedCombinations.length; i++) {
      const combo = selectedCombinations[i];
      try {
        await onCreateRate(zone.id, {
          name: combo.name,
          price: combo.totalPrice,
          currency,
          description: combo.description,
          minWeight: combo.totalWeight,
          maxWeight: combo.totalWeight,
        });
        setCreatedCount(i + 1);
      } catch (error) {
        console.error("Error creating rate:", error);
      }
    }

    setCreating(false);
    setTimeout(() => {
      onOpenChange(false);
      setStep("config");
    }, 1500);
  };

  const uniqueBikeCounts = [...new Set(combinations.map(c => c.bikeCount))].sort((a, b) => a - b);
  const enabledTypesWithPrice = bikeTypes.filter(t => t.enabled && t.price > 0);

  // Bulk delete functions
  const toggleRateForDelete = (rateId: string) => {
    setSelectedRatesForDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rateId)) {
        newSet.delete(rateId);
      } else {
        newSet.add(rateId);
      }
      return newSet;
    });
  };

  const selectAllRatesForDelete = () => {
    if (zone) {
      setSelectedRatesForDelete(new Set(zone.rates.map(r => r.id)));
    }
  };

  const deselectAllRatesForDelete = () => {
    setSelectedRatesForDelete(new Set());
  };

  const handleBulkDelete = async () => {
    if (!zone || !onDeleteRate || selectedRatesForDelete.size === 0) return;

    setDeleting(true);
    setDeletedCount(0);
    setDeleteStep("deleting");

    const ratesToDelete = Array.from(selectedRatesForDelete);
    
    for (let i = 0; i < ratesToDelete.length; i++) {
      try {
        await onDeleteRate(zone.id, ratesToDelete[i]);
        setDeletedCount(i + 1);
      } catch (error) {
        console.error("Error deleting rate:", error);
      }
    }

    setDeleting(false);
    setTimeout(() => {
      onOpenChange(false);
      setDeleteStep("select");
      setSelectedRatesForDelete(new Set());
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Rate Manager
          </DialogTitle>
          <DialogDescription>
            {zone?.name} - Generate or delete shipping rates
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "generate" | "delete")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Generate Rates
            </TabsTrigger>
            <TabsTrigger value="delete" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Bulk Delete
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-4">
            {step === "config" && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <Bike className="h-4 w-4" />
                1. Configure Bike Types
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Set the weight and shipping price for each bike type in this zone
              </p>
              
              <div className="space-y-4">
                {bikeTypes.map((bike) => (
                  <div
                    key={bike.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      bike.enabled ? "border-primary bg-primary/5" : "border-border bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={bike.enabled}
                          onCheckedChange={(checked) => 
                            updateBikeType(bike.id, 'enabled', !!checked)
                          }
                        />
                        <span className="font-medium">{bike.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Weight:</Label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={bike.weight}
                            onChange={(e) => updateBikeType(bike.id, 'weight', parseFloat(e.target.value) || 0)}
                            className="w-20 h-8"
                            disabled={!bike.enabled}
                          />
                          <span className="text-sm text-muted-foreground">kg</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Price:</Label>
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={bike.price || ''}
                            onChange={(e) => updateBikeType(bike.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-24 h-8"
                            placeholder="0.00"
                            disabled={!bike.enabled}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="customRateName" className="text-base font-semibold">
                2. Custom Rate Name
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Max 80 characters. Example: "10-15 Days, DAP" → "10-15 Days, DAP | 1x E-Bike"
              </p>
              <div className="relative">
                <Input
                  id="customRateName"
                  type="text"
                  value={customRateName}
                  onChange={(e) => setCustomRateName(e.target.value.slice(0, 80))}
                  placeholder="10-15 Days, DAP"
                  maxLength={80}
                  className={`w-full ${customRateName.length > 70 ? 'border-amber-500' : ''}`}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                  customRateName.length > 70 ? 'text-amber-500' : 'text-muted-foreground'
                }`}>
                  {customRateName.length}/80
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="maxBikes" className="text-base font-semibold">
                3. Maximum Bikes per Order
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Generate combinations for up to this many bikes
              </p>
              <Input
                id="maxBikes"
                type="number"
                min={2}
                max={10}
                value={maxBikes}
                onChange={(e) => setMaxBikes(Math.min(10, Math.max(2, parseInt(e.target.value) || 2)))}
                className="w-32"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {enabledTypesWithPrice.length} bike types configured
              </p>
              <Button
                onClick={handleGenerateCombinations}
                disabled={enabledTypesWithPrice.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Generate Combinations
              </Button>
            </div>
          </div>
        )}

            {step === "review" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={selectAllCombinations}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllCombinations}>
                      Deselect All
                    </Button>
                    <span className="text-muted-foreground mx-2">|</span>
                    {uniqueBikeCounts.map((count) => (
                      <Button
                        key={count}
                        variant="outline"
                        size="sm"
                        onClick={() => selectByBikeCount(count)}
                      >
                        {count} bikes
                      </Button>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("config")}>
                    ← Back
                  </Button>
                </div>

                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-2">
                    {uniqueBikeCounts.map((bikeCount) => (
                      <div key={bikeCount} className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground sticky top-0 bg-background py-1 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {bikeCount} Bikes ({combinations.filter(c => c.bikeCount === bikeCount).length} combinations)
                        </h4>
                        {combinations
                          .filter(c => c.bikeCount === bikeCount)
                          .map((combo) => (
                            <div
                              key={combo.id}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                combo.selected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:bg-muted"
                              }`}
                              onClick={() => toggleCombination(combo.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox checked={combo.selected} />
                                <div>
                                  <p className="font-medium text-sm">{combo.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {combo.description}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="default" className="text-base font-bold">
                                ${combo.totalPrice.toFixed(2)}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm">
                    <span className="font-semibold">{selectedCombinations.length}</span> of{" "}
                    {combinations.length} combinations selected
                  </p>
                  <Button
                    onClick={handleCreateRates}
                    disabled={selectedCombinations.length === 0}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Create {selectedCombinations.length} Rates in Shopify
                  </Button>
                </div>
              </div>
            )}

            {step === "creating" && (
              <div className="py-12 text-center space-y-4">
                {creating ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">
                      Creating rates in Shopify...
                    </p>
                    <p className="text-muted-foreground">
                      {createdCount} of {selectedCombinations.length} rates created
                    </p>
                    <div className="w-full bg-muted rounded-full h-2 max-w-md mx-auto">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(createdCount / selectedCombinations.length) * 100}%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-lg font-medium text-green-600">
                      All rates created successfully!
                    </p>
                    <p className="text-muted-foreground">
                      {createdCount} shipping rates were added to Shopify
                    </p>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="delete" className="mt-4">
            {deleteStep === "select" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllRatesForDelete}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllRatesForDelete}>
                      Deselect All
                    </Button>
                  </div>
                  <Badge variant="secondary">
                    {selectedRatesForDelete.size} selected
                  </Badge>
                </div>

                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-2">
                    {zone?.rates && zone.rates.length > 0 ? (
                      zone.rates.map((rate) => (
                        <div
                          key={rate.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedRatesForDelete.has(rate.id)
                              ? "border-destructive bg-destructive/5"
                              : "border-border hover:bg-muted"
                          }`}
                          onClick={() => toggleRateForDelete(rate.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedRatesForDelete.has(rate.id)} />
                            <div>
                              <p className="font-medium text-sm">{rate.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {rate.description || "No description"}
                                {rate.minWeight !== undefined && ` | Weight: ${rate.minWeight}kg`}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {rate.currency} {rate.price.toFixed(2)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No rates available in this zone
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    This action cannot be undone
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={selectedRatesForDelete.size === 0 || !onDeleteRate}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedRatesForDelete.size} Rates
                  </Button>
                </div>
              </div>
            )}

            {deleteStep === "deleting" && (
              <div className="py-12 text-center space-y-4">
                {deleting ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-destructive" />
                    <p className="text-lg font-medium">
                      Deleting rates from Shopify...
                    </p>
                    <p className="text-muted-foreground">
                      {deletedCount} of {selectedRatesForDelete.size} rates deleted
                    </p>
                    <div className="w-full bg-muted rounded-full h-2 max-w-md mx-auto">
                      <div
                        className="bg-destructive h-2 rounded-full transition-all"
                        style={{
                          width: `${(deletedCount / selectedRatesForDelete.size) * 100}%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-lg font-medium text-green-600">
                      All rates deleted successfully!
                    </p>
                    <p className="text-muted-foreground">
                      {deletedCount} shipping rates were removed from Shopify
                    </p>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
