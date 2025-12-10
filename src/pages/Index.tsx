import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, Settings, MapPin, RefreshCw, AlertCircle, Layers, Calculator, Zap } from "lucide-react";
import { FreightZonesList } from "@/components/FreightZonesList";
import { EditRateModal } from "@/components/EditRateModal";
import { BulkEditModal, BulkUpdate } from "@/components/BulkEditModal";
import { MultipliersModal } from "@/components/MultipliersModal";
import { CarrierRatesManager } from "@/components/CarrierRatesManager";
import { useShopifyFreight } from "@/hooks/useShopifyFreight";
import { useShippingMultipliers } from "@/hooks/useShippingMultipliers";
import { useToast } from "@/hooks/use-toast";
import type { ShippingZone, ShippingRate } from "@/types/shipping";

// Re-export types for backward compatibility
export type { ShippingZone, ShippingRate } from "@/types/shipping";

const Index = () => {
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isMultipliersOpen, setIsMultipliersOpen] = useState(false);
  
  const { zones, loading, error, fetchZones, updateRate, bulkUpdateRates, createRate, deleteRate } = useShopifyFreight();
  const { 
    multipliers, 
    addMultiplier, 
    updateMultiplier, 
    deleteMultiplier 
  } = useShippingMultipliers();
  const { toast } = useToast();

  const handleEditRate = (zone: ShippingZone, rate: ShippingRate) => {
    setSelectedZone(zone);
    setSelectedRate(rate);
    setIsEditModalOpen(true);
  };

  const handleSaveRate = async (updatedRate: ShippingRate) => {
    if (!selectedZone || !selectedRate) return;
    
    try {
      await updateRate(selectedZone, updatedRate);
      
      toast({
        title: "Rate updated successfully!",
        description: `The rate "${updatedRate.name}" was updated in zone "${selectedZone.name}".`,
      });
      
      setIsEditModalOpen(false);
      setSelectedRate(null);
      setSelectedZone(null);
    } catch (error) {
      toast({
        title: "Error updating rate",
        description: "An error occurred while trying to update the rate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdate = async (updates: BulkUpdate[]) => {
    try {
      await bulkUpdateRates(updates);
      
      toast({
        title: "Rates updated in bulk!",
        description: `${updates.length} rates were updated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error in bulk update",
        description: "An error occurred while updating the rates. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCreateRate = async (zoneId: string, rate: {
    name: string;
    price: number;
    currency: string;
    description?: string;
    minWeight?: number;
    maxWeight?: number;
  }) => {
    try {
      await createRate(zoneId, rate);
      toast({
        title: "Rate created successfully!",
        description: `The rate "${rate.name}" was created.`,
      });
    } catch (error) {
      toast({
        title: "Error creating rate",
        description: "An error occurred while creating the rate. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteRate = async (zoneId: string, methodId: string) => {
    try {
      await deleteRate(zoneId, methodId);
      toast({
        title: "Rate deleted successfully!",
        description: "The shipping rate was removed from Shopify.",
      });
    } catch (error) {
      toast({
        title: "Error deleting rate",
        description: "An error occurred while deleting the rate. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleRefresh = () => {
    fetchZones();
    toast({
      title: "Data refreshed",
      description: "Freight zones were reloaded from Shopify.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8" />
              <h1 className="text-xl font-bold">Shopify Freight Wizard</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="sm" onClick={() => setIsMultipliersOpen(true)}>
                <Calculator className="h-4 w-4 mr-2" />
                Multipliers
              </Button>
              <Button variant="secondary" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <Card className="p-6 mb-8 border-shopify-error">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-shopify-error" />
              <div>
                <h3 className="font-semibold text-shopify-error">Error connecting to Shopify</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Zones</p>
                <p className="text-2xl font-bold text-shopify-blue">
                  {loading ? '...' : zones.length}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-shopify-blue" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rates</p>
                <p className="text-2xl font-bold text-shopify-blue">
                  {loading ? '...' : zones.reduce((acc, zone) => acc + zone.rates.length, 0)}
                </p>
              </div>
              <Truck className="h-8 w-8 text-shopify-blue" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Multipliers</p>
                <p className="text-2xl font-bold text-shopify-blue">
                  {multipliers.filter(m => m.is_active).length}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-shopify-blue" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-2xl font-bold text-shopify-success">
                  {error ? 'Error' : loading ? 'Loading...' : 'Connected'}
                </p>
              </div>
              <div className={`h-3 w-3 rounded-full ${error ? 'bg-shopify-error' : 'bg-shopify-success animate-pulse'}`} />
            </div>
          </Card>
        </div>

        {/* Tabs for Static Rates vs Dynamic Carrier Service */}
        <Tabs defaultValue="static" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="static" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Static Rates
            </TabsTrigger>
            <TabsTrigger value="carrier" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Carrier API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="static" className="space-y-6">
            {/* Bulk Edit Button */}
            <div className="mb-6">
              <Button 
                onClick={() => setIsBulkEditOpen(true)}
                className="bg-shopify-blue hover:bg-shopify-blue-dark"
                disabled={loading || zones.length === 0}
              >
                <Layers className="h-4 w-4 mr-2" />
                Bulk Edit
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Edit multiple freight rates at once with filters by category, country, or region.
              </p>
            </div>

            {/* Zones List */}
            <FreightZonesList 
              zones={zones} 
              onEditRate={handleEditRate}
              onCreateRate={handleCreateRate}
              onDeleteRate={handleDeleteRate}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="carrier">
            <CarrierRatesManager />
          </TabsContent>
        </Tabs>

        {/* Edit Rate Modal */}
        {selectedRate && selectedZone && (
          <EditRateModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            rate={selectedRate}
            zone={selectedZone}
            onSave={handleSaveRate}
          />
        )}

        {/* Bulk Edit Modal */}
        <BulkEditModal
          isOpen={isBulkEditOpen}
          onClose={() => setIsBulkEditOpen(false)}
          zones={zones}
          multipliers={multipliers}
          onBulkUpdate={handleBulkUpdate}
        />

        {/* Multipliers Modal */}
        <MultipliersModal
          isOpen={isMultipliersOpen}
          onClose={() => setIsMultipliersOpen(false)}
          multipliers={multipliers}
          onAdd={addMultiplier}
          onUpdate={updateMultiplier}
          onDelete={deleteMultiplier}
        />
      </main>
    </div>
  );
};

export default Index;
