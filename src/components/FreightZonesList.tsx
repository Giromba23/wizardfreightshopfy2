import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Globe, DollarSign, Tag, ChevronDown, ChevronRight, Plus, Trash2, Loader2, Calculator } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateRateModal } from "./CreateRateModal";
import { RateCombinationGenerator } from "./RateCombinationGenerator";
import type { ShippingZone, ShippingRate } from "@/types/shipping";

interface FreightZonesListProps {
  zones: ShippingZone[];
  onEditRate: (zone: ShippingZone, rate: ShippingRate) => void;
  onCreateRate?: (zoneId: string, rate: {
    name: string;
    price: number;
    currency: string;
    description?: string;
    minWeight?: number;
    maxWeight?: number;
  }) => Promise<void>;
  onDeleteRate?: (zoneId: string, methodId: string) => Promise<void>;
  loading?: boolean;
}

export const FreightZonesList = ({ 
  zones, 
  onEditRate, 
  onCreateRate,
  onDeleteRate,
  loading = false 
}: FreightZonesListProps) => {
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedZoneForCreate, setSelectedZoneForCreate] = useState<ShippingZone | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<{ zone: ShippingZone; rate: ShippingRate } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedZoneForGenerator, setSelectedZoneForGenerator] = useState<ShippingZone | null>(null);

  const filteredZones = selectedZone === "all" 
    ? zones 
    : zones.filter(zone => zone.id === selectedZone);

  const toggleZone = (zoneId: string) => {
    setOpenZones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) {
        newSet.delete(zoneId);
      } else {
        newSet.add(zoneId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setOpenZones(new Set(filteredZones.map(z => z.id)));
  };

  const collapseAll = () => {
    setOpenZones(new Set());
  };

  const handleOpenCreateModal = (zone: ShippingZone) => {
    setSelectedZoneForCreate(zone);
    setCreateModalOpen(true);
  };

  const handleOpenGenerator = (zone: ShippingZone) => {
    setSelectedZoneForGenerator(zone);
    setGeneratorOpen(true);
  };

  const handleDeleteClick = (zone: ShippingZone, rate: ShippingRate) => {
    setRateToDelete({ zone, rate });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!rateToDelete || !onDeleteRate) return;
    
    setDeleting(true);
    try {
      await onDeleteRate(rateToDelete.zone.id, rateToDelete.rate.id);
      setDeleteDialogOpen(false);
      setRateToDelete(null);
    } catch (error) {
      console.error("Error deleting rate:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Shipping Zones</h2>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted animate-pulse">
              <div className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-foreground">Shipping Zones</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="w-[220px] bg-background">
              <SelectValue placeholder="Filter by zone" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50 max-h-[300px]">
              <SelectItem value="all">All Zones ({zones.length})</SelectItem>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name} ({zone.countries.join(", ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="bg-shopify-blue hover:bg-shopify-blue-dark" disabled>
            <Globe className="h-4 w-4 mr-2" />
            New Zone
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredZones.map((zone) => {
          const isOpen = openZones.has(zone.id);
          
          return (
            <Collapsible key={zone.id} open={isOpen} onOpenChange={() => toggleZone(zone.id)}>
              <Card className="border-l-4 border-l-shopify-blue">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                          {isOpen ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="h-5 w-5 text-shopify-blue" />
                        {zone.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {zone.rates.length} método{zone.rates.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {zone.countries.join(", ")}
                      </Badge>
                      {onCreateRate && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenGenerator(zone)}
                            className="hover:bg-primary hover:text-primary-foreground"
                          >
                            <Calculator className="h-4 w-4 mr-1" />
                            Generate Combos
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCreateModal(zone)}
                            className="hover:bg-primary hover:text-primary-foreground"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Rate
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <div className="px-6 pb-6">
                    <div className="grid gap-3">
                      {zone.rates.map((rate) => (
                        <div
                          key={rate.id}
                          className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h5 className="font-medium">{rate.name}</h5>
                              <Badge variant="outline" className="text-xs">
                                {rate.estimatedDays}
                              </Badge>
                              {rate.category && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Tag className="h-3 w-3" />
                                  {rate.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {rate.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Weight: {rate.minWeight || '—'}kg - {rate.maxWeight || '—'}kg</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-lg font-bold text-shopify-blue">
                                <DollarSign className="h-4 w-4" />
                                {rate.price.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {rate.currency}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEditRate(zone, rate)}
                              className="hover:bg-shopify-blue hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {onDeleteRate && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteClick(zone, rate)}
                                className="hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Rate Combination Generator */}
      {onCreateRate && (
        <RateCombinationGenerator
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          zone={selectedZoneForGenerator}
          onCreateRate={onCreateRate}
          onDeleteRate={onDeleteRate}
        />
      )}

      {/* Create Rate Modal */}
      {onCreateRate && (
        <CreateRateModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          zone={selectedZoneForCreate}
          onCreateRate={onCreateRate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rate "{rateToDelete?.rate.name}" 
              from zone "{rateToDelete?.zone.name}"? This action cannot be undone 
              and will be reflected in Shopify immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
