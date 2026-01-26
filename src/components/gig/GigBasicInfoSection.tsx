import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Clock, DollarSign, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import TagsInput from '../TagsInput';
import MarkdownEditor from '../MarkdownEditor';
import { getGig, updateGig } from '../../utils/api';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';
import { toast } from 'sonner';

type GigStatus = 'DateHold' | 'Proposed' | 'Booked' | 'Completed' | 'Cancelled' | 'Settled';

const basicInfoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  start_time: z.date({ required_error: 'Start date/time is required' }),
  end_time: z.date({ required_error: 'End date/time is required' }),
  timezone: z.string().min(1, 'Timezone is required'),
  status: z.enum(['DateHold', 'Proposed', 'Booked', 'Completed', 'Cancelled', 'Settled']),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  amount_paid: z.string().refine((val) => {
    if (!val.trim()) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Amount must be a positive number'),
}).refine((data) => {
  if (data.start_time && data.end_time) {
    return data.end_time > data.start_time;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

interface BasicInfoFormData {
  title: string;
  start_time: Date | undefined;
  end_time: Date | undefined;
  timezone: string;
  status: GigStatus;
  tags: string[];
  notes: string;
  amount_paid: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
];

const STATUS_OPTIONS: { value: GigStatus; label: string }[] = [
  { value: 'DateHold', label: 'Hold Date' },
  { value: 'Proposed', label: 'Proposed' },
  { value: 'Booked', label: 'Booked' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Settled', label: 'Paid' },
];

const SUGGESTED_TAGS = [
  'Concert',
  'Corporate Event',
  'Festival',
  'Theater',
  'Wedding',
  'Live Music',
  'Conference',
  'Private Event',
  'Outdoor',
  'Multi-Day',
  'Charity',
  'Gala',
];

interface GigBasicInfoSectionProps {
  gigId?: string;
  onCreate?: (data: BasicInfoFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export default function GigBasicInfoSection({ gigId, onCreate, isSubmitting: externalIsSubmitting }: GigBasicInfoSectionProps) {
  const [isLoading, setIsLoading] = useState(!!gigId);
  const isCreateMode = !gigId;

  const { control, handleSubmit, formState: { errors, isDirty, isSubmitting: internalIsSubmitting }, setValue, watch, reset } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      start_time: undefined,
      end_time: undefined,
      timezone: 'America/Los_Angeles',
      status: 'DateHold',
      tags: [],
      notes: '',
      amount_paid: '',
    },
  });

  const isSubmitting = externalIsSubmitting || internalIsSubmitting;

  const { saveState, triggerSave } = useAutoSave<BasicInfoFormData>({
    gigId: gigId || '',
    onSave: async (data) => {
      if (!gigId) return;
      await updateGig(gigId, {
        title: data.title,
        start: data.start_time?.toISOString(),
        end: data.end_time?.toISOString(),
        timezone: data.timezone,
        status: data.status,
        tags: data.tags,
        notes: data.notes,
        amount_paid: data.amount_paid ? parseFloat(data.amount_paid) : null,
      });
    }
  });

  const formValues = watch();

  useEffect(() => {
    if (isDirty && gigId) {
      // Validate before triggering auto-save
      const isValid = Object.keys(errors).length === 0;
      if (isValid) {
        triggerSave(formValues);
      }
    }
  }, [formValues, isDirty, errors, triggerSave, gigId]);

  useEffect(() => {
    if (gigId) {
      loadGigData();
    }
  }, [gigId]);

  const loadGigData = async () => {
    if (!gigId) return;
    setIsLoading(true);
    try {
      const gig = await getGig(gigId);

      const data = {
        title: gig.title || '',
        start_time: gig.start ? new Date(gig.start) : undefined,
        end_time: gig.end ? new Date(gig.end) : undefined,
        timezone: gig.timezone || 'America/Los_Angeles',
        status: gig.status || 'DateHold',
        tags: gig.tags || [],
        notes: gig.notes || '',
        amount_paid: gig.amount_paid ? gig.amount_paid.toString() : '',
      };
      reset(data);
    } catch (error: any) {
      console.error('Error loading gig data:', error);
      toast.error(error.message || 'Failed to load gig data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isCreateMode ? 'Create New Gig' : 'Basic Information'}</CardTitle>
        {!isCreateMode && <SaveStateIndicator state={saveState} />}
      </CardHeader>
      <CardContent>
        <form onSubmit={isCreateMode ? handleSubmit(onCreate!) : (e) => e.preventDefault()}>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Gig Title <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="title"
                    placeholder="Enter gig title"
                    className={errors.title ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.title && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">
                  Start Date/Time <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Controller
                    name="start_time"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        className={`pl-9 ${errors.start_time ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </div>
                {errors.start_time && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.start_time.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">
                  End Date/Time <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Controller
                    name="end_time"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        className={`pl-9 ${errors.end_time ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </div>
                {errors.end_time && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.end_time.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">
                Timezone <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <TagsInput
                    value={field.value || []}
                    onChange={field.onChange}
                    suggestions={SUGGESTED_TAGS}
                    placeholder="Add tags to categorize this gig..."
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <MarkdownEditor
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Add notes about this gig..."
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Amount Paid
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Controller
                  name="amount_paid"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="amount_paid"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className={`pl-7 ${errors.amount_paid ? 'border-red-500' : ''}`}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>
              {errors.amount_paid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.amount_paid.message}
                </p>
              )}
            </div>

            {isCreateMode && (
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Gig'
                  )}
                </Button>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
