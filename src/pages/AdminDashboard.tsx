import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Check, 
  X, 
  Clock, 
  History,
  DollarSign,
  ArrowRight,
  Loader2,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil
} from "lucide-react";
import { usePendingChanges, PendingChange, ChangeLog } from "@/hooks/usePendingChanges";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AdminDashboard = () => {
  const { 
    pendingChanges, 
    changeLogs, 
    pendingCount, 
    loading, 
    approveChange, 
    rejectChange,
    updateProposedPrice,
    fetchPendingChanges,
    fetchChangeLogs
  } = usePendingChanges();
  const { toast } = useToast();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editRateName, setEditRateName] = useState<string>("");

  const handleStartEdit = (change: PendingChange) => {
    setEditingId(change.id);
    setEditPrice(change.proposed_price.toString());
    setEditRateName(change.proposed_rate_name || change.rate_name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrice("");
    setEditRateName("");
  };

  const handleSaveEdit = async (change: PendingChange) => {
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ 
        title: "Invalid price", 
        description: "Please enter a valid price",
        variant: "destructive" 
      });
      return;
    }

    if (!editRateName.trim()) {
      toast({ 
        title: "Invalid name", 
        description: "Please enter a valid rate name",
        variant: "destructive" 
      });
      return;
    }

    setProcessingId(change.id);
    try {
      await updateProposedPrice(change.id, newPrice, editRateName.trim());
      toast({ 
        title: "Changes saved!", 
        description: `Proposed price: $${newPrice.toFixed(2)}, Name: ${editRateName.trim()}` 
      });
      setEditingId(null);
      setEditPrice("");
      setEditRateName("");
    } catch (err) {
      toast({ 
        title: "Error updating", 
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive" 
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (change: PendingChange) => {
    setProcessingId(change.id);
    try {
      await approveChange(change.id, 'admin');
      toast({ 
        title: "Change approved!", 
        description: `Rate "${change.rate_name}" updated on Shopify` 
      });
    } catch (err) {
      toast({ 
        title: "Error approving", 
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive" 
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (change: PendingChange) => {
    setProcessingId(change.id);
    try {
      await rejectChange(change.id, 'admin');
      toast({ 
        title: "Change rejected", 
        description: `Proposal for "${change.rate_name}" was rejected` 
      });
    } catch (err) {
      toast({ 
        title: "Error rejecting", 
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive" 
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingItems = pendingChanges.filter(c => c.status === 'pending');
  const reviewedItems = pendingChanges.filter(c => c.status !== 'pending');

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'proposed': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'applied': return <Check className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'proposed': return 'Proposed';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'applied': return 'Applied';
      default: return action;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Master</h1>
                <p className="text-sm text-muted-foreground">Change Approval</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
                  <Bell className="h-3 w-3" />
                  {pendingCount} new
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { fetchPendingChanges(); fetchChangeLogs(); }}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Pending
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">All caught up!</h3>
                  <p className="text-muted-foreground">No pending changes awaiting approval</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingItems.map((change) => (
                  <Card key={change.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{change.zone_name}</Badge>
                            <span className="text-muted-foreground">→</span>
                            {editingId === change.id ? (
                              <Input
                                type="text"
                                value={editRateName}
                                onChange={(e) => setEditRateName(e.target.value)}
                                className="h-8 max-w-xs"
                                placeholder="Rate name"
                              />
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {change.proposed_rate_name || change.rate_name}
                                </span>
                                {change.proposed_rate_name && change.proposed_rate_name !== change.rate_name && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    {change.rate_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground line-through">
                                $ {change.current_price.toFixed(2)}
                              </span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              {editingId === change.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    className="w-24 h-8"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-green-600"
                                    onClick={() => handleSaveEdit(change)}
                                    disabled={processingId === change.id}
                                  >
                                    {processingId === change.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-muted-foreground"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="font-bold text-lg text-primary">
                                  $ {change.proposed_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            {editingId !== change.id && (
                              <Badge variant={change.proposed_price > change.current_price ? "destructive" : "secondary"}>
                                {change.proposed_price > change.current_price ? "+" : ""}
                                {((change.proposed_price - change.current_price) / change.current_price * 100).toFixed(1)}%
                              </Badge>
                            )}
                          </div>

                          {change.notes && (
                            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              {change.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>By: {change.proposed_by}</span>
                            <span>•</span>
                            <span>
                              {format(new Date(change.created_at), "MMM dd, yyyy 'at' HH:mm")}
                            </span>
                          </div>
                        </div>

                        {editingId !== change.id && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(change)}
                              disabled={processingId === change.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => handleReject(change)}
                              disabled={processingId === change.id}
                            >
                              {processingId === change.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(change)}
                              disabled={processingId === change.id}
                            >
                              {processingId === change.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Change Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {changeLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No records found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {changeLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                      >
                        {getActionIcon(log.action)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{log.zone_name}</Badge>
                            <span className="font-medium text-sm truncate">{log.rate_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">$ {log.old_price.toFixed(2)}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">$ {log.new_price.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {getActionLabel(log.action)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.created_at), "MM/dd HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
