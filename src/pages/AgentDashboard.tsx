import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Globe, 
  DollarSign, 
  Tag, 
  Send, 
  Loader2,
  CheckCircle,
  Clock,
  Package,
  Search,
  Filter,
  X
} from "lucide-react";
import { useShopifyFreight } from "@/hooks/useShopifyFreight";
import { usePendingChanges } from "@/hooks/usePendingChanges";
import { useToast } from "@/hooks/use-toast";
import type { ShippingZone, ShippingRate } from "@/types/shipping";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AgentDashboard = () => {
  const { zones, loading: zonesLoading, fetchZones } = useShopifyFreight();
  const { proposeChange, pendingChanges, loading: changesLoading } = usePendingChanges();
  const { toast } = useToast();
  
  const [selectedRate, setSelectedRate] = useState<{zone: ShippingZone, rate: ShippingRate} | null>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposedRateName, setProposedRateName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Get unique categories from all rates
  const categories = useMemo(() => {
    const cats = new Set<string>();
    zones.forEach(zone => {
      zone.rates.forEach(rate => {
        if (rate.category) cats.add(rate.category);
      });
    });
    return Array.from(cats).sort();
  }, [zones]);

  // Filter zones based on search and filters
  const filteredZones = useMemo(() => {
    return zones
      .filter(zone => {
        // Zone filter
        if (selectedZoneFilter !== "all" && zone.id !== selectedZoneFilter) {
          return false;
        }
        // Search filter (zone name or country)
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesZone = zone.name.toLowerCase().includes(query);
          const matchesCountry = zone.countries.some(c => c.toLowerCase().includes(query));
          const matchesRate = zone.rates.some(r => r.name.toLowerCase().includes(query));
          if (!matchesZone && !matchesCountry && !matchesRate) {
            return false;
          }
        }
        return true;
      })
      .map(zone => {
        // Filter rates by category
        if (selectedCategoryFilter === "all") {
          return zone;
        }
        return {
          ...zone,
          rates: zone.rates.filter(rate => rate.category === selectedCategoryFilter)
        };
      })
      .filter(zone => zone.rates.length > 0); // Remove zones with no matching rates
  }, [zones, searchQuery, selectedZoneFilter, selectedCategoryFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedZoneFilter("all");
    setSelectedCategoryFilter("all");
  };

  const hasActiveFilters = searchQuery || selectedZoneFilter !== "all" || selectedCategoryFilter !== "all";

  const handleSelectRate = (zone: ShippingZone, rate: ShippingRate) => {
    setSelectedRate({ zone, rate });
    setProposedPrice(rate.price.toString());
    setProposedRateName(rate.name);
    setNotes("");
  };

  const handleSubmitProposal = async () => {
    if (!selectedRate) return;
    
    const newPrice = parseFloat(proposedPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: "Invalid value", variant: "destructive" });
      return;
    }

    const nameChanged = proposedRateName.trim() !== selectedRate.rate.name;
    if (newPrice === selectedRate.rate.price && !nameChanged) {
      toast({ title: "No changes", description: "Change the price or name to propose a modification", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await proposeChange(
        selectedRate.rate.id,
        selectedRate.zone.id,
        selectedRate.zone.name,
        selectedRate.rate.name,
        selectedRate.rate.price,
        newPrice,
        selectedRate.rate.currency,
        'agent',
        notes || undefined,
        nameChanged ? proposedRateName.trim() : undefined
      );
      
      toast({ 
        title: "Proposal submitted!", 
        description: "Waiting for administrator approval" 
      });
      setSelectedRate(null);
    } catch (err) {
      toast({ 
        title: "Error submitting proposal", 
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRatePendingChange = (rateId: string) => {
    return pendingChanges.find(c => c.rate_id === rateId && c.status === 'pending');
  };

  const myPendingCount = pendingChanges.filter(c => c.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Agent Panel</h1>
                <p className="text-sm text-muted-foreground">Freight Quotation & Editing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {myPendingCount > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {myPendingCount} pending
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => fetchZones()}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {zonesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters Section */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Clear all
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search zone, country or rate..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Zone Filter */}
                  <Select value={selectedZoneFilter} onValueChange={setSelectedZoneFilter}>
                    <SelectTrigger>
                      <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="All zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All zones</SelectItem>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Category Filter */}
                  <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                    <SelectTrigger>
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Freight Zones ({filteredZones.length}{filteredZones.length !== zones.length ? ` of ${zones.length}` : ''})
              </h2>
              <p className="text-sm text-muted-foreground">
                Click on a rate to propose a change
              </p>
            </div>

            {filteredZones.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No results found</h3>
                  <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                    Clear filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredZones.map((zone) => (
                  <Card key={zone.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Globe className="h-4 w-4 text-primary" />
                          {zone.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {zone.countries.slice(0, 3).join(", ")}
                          {zone.countries.length > 3 && ` +${zone.countries.length - 3}`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {zone.rates.map((rate) => {
                          const pending = getRatePendingChange(rate.id);
                          return (
                            <div
                              key={rate.id}
                              onClick={() => !pending && handleSelectRate(zone, rate)}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                pending 
                                  ? 'bg-yellow-500/10 border-yellow-500/30 cursor-not-allowed' 
                                  : 'bg-muted/50 hover:bg-muted cursor-pointer'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{rate.name}</span>
                                  {rate.category && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {rate.category}
                                    </Badge>
                                  )}
                                </div>
                                {pending && (
                                  <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Proposal: $ {pending.proposed_price.toFixed(2)} (pending)
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 font-bold text-primary">
                                <DollarSign className="h-4 w-4" />
                                {rate.price.toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Proposal Modal */}
      <Dialog open={!!selectedRate} onOpenChange={() => setSelectedRate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose Price Change</DialogTitle>
            <DialogDescription>
              Submit a price change proposal for administrator approval.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRate && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Zone</p>
                <p className="font-medium">{selectedRate.zone.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Custom Rate Name</p>
                <Input
                  type="text"
                  value={proposedRateName}
                  onChange={(e) => setProposedRateName(e.target.value)}
                  placeholder="E.g.: 45-55 Days, DDP"
                />
                {proposedRateName !== selectedRate.rate.name && (
                  <p className="text-xs text-primary mt-1">Original: {selectedRate.rate.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="font-bold text-lg">$ {selectedRate.rate.price.toFixed(2)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">New Price</p>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes (optional)</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g.: Updated quote from carrier X..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitProposal} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentDashboard;
