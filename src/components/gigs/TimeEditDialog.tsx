import { AlertCircle, CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface TimeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigTitle?: string;
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  onSave: () => void;
}

export function TimeEditDialog({
  open,
  onOpenChange,
  gigTitle,
  date,
  setDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  onSave,
}: TimeEditDialogProps) {
  const isInvalid = !date || !startTime || !endTime || (endTime <= startTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Date & Time</DialogTitle>
          <DialogDescription>
            Update the date and times for {gigTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date ? new Date(date) : undefined}
                  onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Existing time inputs */}
          <div className="space-y-2">
            <Label htmlFor="start-time">Start Time</Label>
            <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">End Time</Label>
            <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>

          {isInvalid && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Please select a valid date and ensure end time is after start time
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isInvalid}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}