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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import type { ShippingZone } from "@/types/shipping";

interface CreateRateModalProps {
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
}

const CATEGORIES = [
  "Road Bike",
  "E-Bike",
  "Gravel Bike", 
  "MTB",
  "Frame Only",
  "Accessories",
  "Other"
];

export const CreateRateModal = ({
  open,
  onOpenChange,
  zone,
  onCreateRate,
}: CreateRateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    currency: "USD",
    description: "",
    minWeight: "",
    maxWeight: "",
    category: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone || !formData.name || !formData.price) return;

    setLoading(true);
    try {
      await onCreateRate(zone.id, {
        name: formData.name,
        price: parseFloat(formData.price),
        currency: formData.currency,
        description: formData.description || undefined,
        minWeight: formData.minWeight ? parseFloat(formData.minWeight) : undefined,
        maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : undefined,
      });
      
      // Reset form and close modal
      setFormData({
        name: "",
        price: "",
        currency: "USD",
        description: "",
        minWeight: "",
        maxWeight: "",
        category: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating rate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        price: "",
        currency: "USD",
        description: "",
        minWeight: "",
        maxWeight: "",
        category: "",
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            New Shipping Rate
          </DialogTitle>
          {zone && (
            <p className="text-sm text-muted-foreground">
              Zone: <span className="font-medium">{zone.name}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rate Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 45-55 Days, DDP"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Shipping method description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minWeight">Min Weight (kg)</Label>
              <Input
                id="minWeight"
                type="number"
                step="0.1"
                min="0"
                value={formData.minWeight}
                onChange={(e) => setFormData({ ...formData, minWeight: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxWeight">Max Weight (kg)</Label>
              <Input
                id="maxWeight"
                type="number"
                step="0.1"
                min="0"
                value={formData.maxWeight}
                onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                placeholder="100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.price}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
