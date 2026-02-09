import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import TagsInput from '../TagsInput';
import MarkdownEditor from '../MarkdownEditor';
import { getGig, updateGig } from '../../services/gig.service';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';
import { toast } from 'sonner';
import { GigStatus } from '../../utils/supabase/types';
import { GIG_STATUS_CONFIG, SUGGESTED_TAGS } from '../../utils/supabase/constants';
import { formatGigDateTimeForInput, parseGigDateTimeFromInput } from '../../utils/dateUtils';
import { getCommonUSTimezones } from '../../utils/timezones';

const basicInfoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  start_time: z.date({ required_error: 'Start date/time is required' }),
  end_time: z.date({ required_error: 'End date/time is required' }),
  timezone: z.string().min(1, 'Timezone is required'),
  status: z.enum(Object.keys(GIG_STATUS_CONFIG) as [string, ...string[]]),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
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
}

const STATUS_OPTIONS: { value: GigStatus; label: string }[] = Object.entries(GIG_STATUS_CONFIG).map(([value, config]) => ({
  value: value as GigStatus,
  label: config.label,
}));



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
    },
  });

  const isSubmitting = externalIsSubmitting || internalIsSubmitting;

  const handleSave = useCallback(async (data: BasicInfoFormData) => {
    if (!gigId) return;
    await updateGig(gigId, {
      title: data.title,
      start: data.start_time?.toISOString(),
      end: data.end_time?.toISOString(),
      timezone: data.timezone,
      status: data.status,
      tags: data.tags,
      notes: data.notes,
    });
  }, [gigId]);

  const handleSaveSuccess = useCallback((data: BasicInfoFormData) => {
    reset(data, { keepDirty: false, keepValues: true });
  }, [reset]);

  const { saveState, triggerSave } = useAutoSave<BasicInfoFormData>({
    gigId: gigId || '',
    onSave: handleSave,
    onSuccess: handleSaveSuccess,
    debounceMs: 2000
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
        <div className="flex items-center gap-2">
          {!isCreateMode && <SaveStateIndicator state={saveState} />}
        </div>
      </CardHeader>
      <CardContent>
        <form 
          id="gig-basic-info-form"
          onSubmit={isCreateMode ? handleSubmit(onCreate!) : (e) => e.preventDefault()}
        >
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
                    onFocus={(e) => {
                      const len = e.target.value.length;
                      e.target.setSelectionRange(len, len);
                    }}
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
                        type={field.value?.toISOString().endsWith('T12:00:00.000Z') ? 'date' : 'datetime-local'}
                        value={formatGigDateTimeForInput(field.value || '', watch('timezone'))}
                        onChange={(e) => {
                          const isDateOnly = e.target.type === 'date';
                          const utcIso = parseGigDateTimeFromInput(e.target.value, watch('timezone'), isDateOnly);
                          field.onChange(utcIso ? new Date(utcIso) : undefined);
                        }}
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
                        type={field.value?.toISOString().endsWith('T12:00:00.000Z') ? 'date' : 'datetime-local'}
                        value={formatGigDateTimeForInput(field.value || '', watch('timezone'))}
                        onChange={(e) => {
                          const isDateOnly = e.target.type === 'date';
                          const utcIso = parseGigDateTimeFromInput(e.target.value, watch('timezone'), isDateOnly);
                          field.onChange(utcIso ? new Date(utcIso) : undefined);
                        }}
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
                      {getCommonUSTimezones().map((tz) => (
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
