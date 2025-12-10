import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, Package, Clock, Tag } from "lucide-react";
import type { ShippingZone, ShippingRate } from "@/types/shipping";
import { BIKE_CATEGORIES } from "@/types/shipping";

interface EditRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  rate: ShippingRate;
  zone: ShippingZone;
  onSave: (updatedRate: ShippingRate) => void;
}

export const EditRateModal = ({ isOpen, onClose, rate, zone, onSave }: EditRateModalProps) => {
  const [formData, setFormData] = useState({
    name: rate.name,
    price: rate.price.toString(),
    currency: rate.currency,
    description: rate.description || "",
    minWeight: rate.minWeight?.toString() || "",
    maxWeight: rate.maxWeight?.toString() || "",
    estimatedDays: rate.estimatedDays,
    category: rate.category || "none",
  });

  const handleSave = () => {
    const updatedRate: ShippingRate = {
      ...rate,
      name: formData.name,
      price: parseFloat(formData.price),
      currency: formData.currency,
      description: formData.description,
      minWeight: formData.minWeight ? parseFloat(formData.minWeight) : undefined,
      maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : undefined,
      estimatedDays: formData.estimatedDays,
      category: formData.category === "none" ? undefined : formData.category,
    };
    onSave(updatedRate);
  };

  const isFormValid = formData.name && formData.price && !isNaN(parseFloat(formData.price));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Edit Shipping Rate
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{zone.name}</Badge>
            <span className="text-sm text-muted-foreground">→</span>
            <Badge variant="outline">{rate.name}</Badge>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Bike Category
            </Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {BIKE_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Category allows filtering rates for bulk editing.
            </p>
          </div>

          {/* Custom Rate Name */}
          <div className="space-y-2">
            <Label htmlFor="rate-name">Custom Rate Name</Label>
            <Input
              id="rate-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 10-12 days, DDP"
            />
          </div>

          {/* Custom Delivery Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Custom Delivery Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Made to order → Shipping (10-12 days). Taxes and duties included."
              maxLength={90}
              className="min-h-[80px]"
            />
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">Max 90 characters recommended.</span>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="pl-10"
                  placeholder="462.00"
                />
              </div>
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weight Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-weight">Minimum Weight (cart total)</Label>
              <div className="flex gap-2">
                <Input
                  id="min-weight"
                  type="number"
                  step="0.1"
                  value={formData.minWeight}
                  onChange={(e) => setFormData({ ...formData, minWeight: e.target.value })}
                  placeholder="15"
                />
                <span className="flex items-center px-3 py-2 border rounded-md bg-muted text-sm">kg</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-weight">Maximum Weight (cart total)</Label>
              <div className="flex gap-2">
                <Input
                  id="max-weight"
                  type="number"
                  step="0.1"
                  value={formData.maxWeight}
                  onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                  placeholder="25"
                />
                <span className="flex items-center px-3 py-2 border rounded-md bg-muted text-sm">kg</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-4">
            Weight conditions apply to the total cart weight at checkout. Leave empty for no weight restrictions.
          </p>

          {/* Estimated Delivery Time */}
          <div className="space-y-2">
            <Label htmlFor="estimated-days">Estimated Delivery Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="estimated-days"
                value={formData.estimatedDays}
                onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                className="pl-10"
                placeholder="10-12 days"
              />
            </div>
          </div>

          {/* Checkout Preview */}
          <div className="space-y-2">
            <Label>Checkout Preview</Label>
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="font-medium">{formData.name || formData.estimatedDays}</span>
                <span className="font-bold">${formData.price}</span>
                {formData.category && formData.category !== "none" && (
                  <Badge variant="secondary" className="text-xs">{formData.category}</Badge>
                )}
              </div>
              {(formData.minWeight || formData.maxWeight) && (
                <p className="text-xs text-muted-foreground mb-1">
                  Weight: {formData.minWeight ? `${formData.minWeight}kg` : '0kg'} - {formData.maxWeight ? `${formData.maxWeight}kg` : '∞'}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {formData.description || "Made to order → Shipping. Taxes and duties included."}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isFormValid}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
