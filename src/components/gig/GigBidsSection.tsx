import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { DollarSign, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { getGig, createGigBid, updateGigBid, deleteGigBid } from '../../utils/api';

interface BidData {
  id: string;
  date_given: string;
  amount: string;
  result: string;
  notes: string;
}

interface GigBidsSectionProps {
  gigId: string;
  currentOrganizationId: string;
}

export default function GigBidsSection({
  gigId,
  currentOrganizationId,
}: GigBidsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bids, setBids] = useState<BidData[]>([]);
  const [showBidNotes, setShowBidNotes] = useState<string | null>(null);
  const [currentBidNotes, setCurrentBidNotes] = useState('');

  useEffect(() => {
    loadBidsData();
  }, [gigId]);

  const loadBidsData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('gig_bids')
        .select('*')
        .eq('gig_id', gigId)
        .eq('organization_id', currentOrganizationId)
        .order('date_given', { ascending: false });

      if (error) throw error;

      const loadedBids = data.map((b: any) => ({
        id: b.id,
        date_given: b.date_given || format(new Date(), 'yyyy-MM-dd'),
        amount: b.amount ? b.amount.toString() : '',
        result: b.result || '',
        notes: b.notes || '',
      }));

      setBids(loadedBids);
    } catch (error: any) {
      console.error('Error loading bids:', error);
      toast.error('Failed to load bids');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBid = () => {
    const newBid: BidData = {
      id: Math.random().toString(36).substr(2, 9),
      date_given: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      result: '',
      notes: '',
    };
    setBids([...bids, newBid]);
  };

  const handleUpdateBid = (id: string, field: keyof BidData, value: string) => {
    setBids(bids.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const handleRemoveBid = (id: string) => {
    setBids(bids.filter(b => b.id !== id));
  };

  const handleOpenBidNotes = (id: string) => {
    const bid = bids.find(b => b.id === id);
    if (bid) {
      setCurrentBidNotes(bid.notes);
      setShowBidNotes(id);
    }
  };

  const handleSaveBidNotes = () => {
    if (showBidNotes) {
      handleUpdateBid(showBidNotes, 'notes', currentBidNotes);
      setShowBidNotes(null);
      setCurrentBidNotes('');
    }
  };

  const isDbId = (id: string) => {
    return id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const createdBidIds: string[] = [];
      
      for (const bid of bids) {
        if (bid.date_given && bid.amount && bid.amount.trim() !== '') {
          const bidData = {
            gig_id: gigId,
            organization_id: currentOrganizationId,
            date_given: bid.date_given,
            amount: parseFloat(bid.amount),
            result: bid.result || null,
            notes: bid.notes || null,
          };

          if (isDbId(bid.id)) {
            await updateGigBid(bid.id, {
              date_given: bidData.date_given,
              amount: bidData.amount,
              result: bidData.result,
              notes: bidData.notes,
            });
          } else {
            const createdBid = await createGigBid(bidData);
            createdBidIds.push(createdBid.id);
          }
        }
      }

      const supabase = createClient();
      const { data: existingBids } = await supabase
        .from('gig_bids')
        .select('id')
        .eq('gig_id', gigId)
        .eq('organization_id', currentOrganizationId);
      
      if (existingBids) {
        const currentBidIds = [
          ...bids.filter(b => isDbId(b.id)).map(b => b.id),
          ...createdBidIds
        ];
        const bidsToDelete = existingBids.filter((eb: any) => !currentBidIds.includes(eb.id));
        for (const bidToDelete of bidsToDelete) {
          await deleteGigBid(bidToDelete.id);
        }
      }

      toast.success('Bids saved');
      await loadBidsData();
    } catch (error: any) {
      console.error('Error saving bids:', error);
      toast.error('Failed to save bids');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-2" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <CardTitle>Bids</CardTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBid}
              disabled={isSaving}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Bid
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bids.map((bid) => (
              <div key={bid.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Label className="text-xs text-gray-600">Date Given:</Label>
                    <Input
                      type="date"
                      value={bid.date_given}
                      onChange={(e) => handleUpdateBid(bid.id, 'date_given', e.target.value)}
                      disabled={isSaving}
                      className="w-32 bg-white"
                    />
                    <Label className="text-xs text-gray-600">Amount:</Label>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bid.amount}
                        onChange={(e) => handleUpdateBid(bid.id, 'amount', e.target.value)}
                        placeholder="0.00"
                        disabled={isSaving}
                        className="pl-5 bg-white"
                      />
                    </div>
                    <Label className="text-xs text-gray-600">Result:</Label>
                    <Select
                      value={bid.result}
                      onValueChange={(value) => handleUpdateBid(bid.id, 'result', value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-32 bg-white">
                        <SelectValue placeholder="Select result" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Accepted">Accepted</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenBidNotes(bid.id)}
                      disabled={isSaving}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBid(bid.id)}
                    disabled={isSaving}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {bids.length === 0 && (
              <p className="text-sm text-gray-500">No bids yet</p>
            )}
            
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showBidNotes !== null} onOpenChange={(open) => {
        if (!open) {
          setShowBidNotes(null);
          setCurrentBidNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bid Notes</DialogTitle>
            <DialogDescription>
              Add notes about this bid.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentBidNotes}
            onChange={(e) => setCurrentBidNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBidNotes(null);
              setCurrentBidNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveBidNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
