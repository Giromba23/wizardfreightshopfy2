import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Calculator, Edit2, Check, X } from "lucide-react";
import type { ShippingMultiplier } from "@/types/shipping";

interface MultipliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  multipliers: ShippingMultiplier[];
  onAdd: (multiplier: Omit<ShippingMultiplier, 'id' | 'created_at' | 'updated_at'>) => Promise<ShippingMultiplier>;
  onUpdate: (id: string, updates: Partial<ShippingMultiplier>) => Promise<ShippingMultiplier>;
  onDelete: (id: string) => Promise<void>;
}

export const MultipliersModal = ({
  isOpen,
  onClose,
  multipliers,
  onAdd,
  onUpdate,
  onDelete,
}: MultipliersModalProps) => {
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMultiplier, setNewMultiplier] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ShippingMultiplier>>({});
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newName || !newMultiplier) return;
    
    setLoading(true);
    try {
      await onAdd({
        name: newName,
        description: newDescription || undefined,
        multiplier: parseFloat(newMultiplier),
        base_quantity: parseInt(newQuantity) || 1,
        is_active: true,
      });
      setNewName('');
      setNewDescription('');
      setNewMultiplier('');
      setNewQuantity('1');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setLoading(true);
    try {
      await onUpdate(id, editValues);
      setEditingId(null);
      setEditValues({});
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este multiplicador?')) return;
    
    setLoading(true);
    try {
      await onDelete(id);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (multiplier: ShippingMultiplier) => {
    setEditingId(multiplier.id);
    setEditValues({
      name: multiplier.name,
      description: multiplier.description,
      multiplier: multiplier.multiplier,
      base_quantity: multiplier.base_quantity,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Gerenciar Multiplicadores de Frete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Multiplier */}
          <Card className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Multiplicador
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: 2 Bicicletas"
                />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: Frete para 2 bikes"
                />
              </div>
              <div>
                <Label className="text-xs">Multiplicador</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newMultiplier}
                  onChange={(e) => setNewMultiplier(e.target.value)}
                  placeholder="Ex: 1.8"
                />
              </div>
              <div>
                <Label className="text-xs">Qtd Base</Label>
                <Input
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="Ex: 2"
                />
              </div>
            </div>
            <Button
              className="w-full mt-3"
              onClick={handleAdd}
              disabled={!newName || !newMultiplier || loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Multiplicador
            </Button>
          </Card>

          {/* Existing Multipliers */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {multipliers.map((m) => (
                <Card key={m.id} className="p-3">
                  {editingId === m.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editValues.name || ''}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          placeholder="Nome"
                        />
                        <Input
                          value={editValues.description || ''}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          placeholder="Descrição"
                        />
                        <Input
                          type="number"
                          step="0.1"
                          value={editValues.multiplier || ''}
                          onChange={(e) => setEditValues({ ...editValues, multiplier: parseFloat(e.target.value) })}
                          placeholder="Multiplicador"
                        />
                        <Input
                          type="number"
                          value={editValues.base_quantity || ''}
                          onChange={(e) => setEditValues({ ...editValues, base_quantity: parseInt(e.target.value) })}
                          placeholder="Qtd Base"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleUpdate(m.id)} disabled={loading}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.description || `Qtd: ${m.base_quantity}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-lg">×{m.multiplier}</p>
                          <p className="text-xs text-muted-foreground">
                            $100 → ${(100 * m.multiplier).toFixed(0)}
                          </p>
                        </div>
                        <Switch
                          checked={m.is_active}
                          onCheckedChange={(checked) => onUpdate(m.id, { is_active: checked })}
                        />
                        <Button size="sm" variant="ghost" onClick={() => startEdit(m)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              
              {multipliers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum multiplicador cadastrado ainda.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
