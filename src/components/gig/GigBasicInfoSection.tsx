import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import TagsInput from '../TagsInput';
import MarkdownEditor from '../MarkdownEditor';
import { getGig, updateGig } from '../../services/gig.service';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';
import { toast } from 'sonner';
import { GigStatus } from '../../utils/supabase/types';
import { GIG_STATUS_CONFIG, SUGGESTED_TAGS } from '../../utils/supabase/constants';
import { formatGigDateTimeForInput, parseGigDateTimeFromInput, isNoonUTC } from '../../utils/dateUtils';
import { getCommonUSTimezones } from '../../utils/timezones';

const basicInfoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  start_time: z.date({ required_error: 'Start date is required' }),
  end_time: z.date().optional().nullable(),
  all_day: z.boolean(),
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
  message: 'End must be after start',
  path: ['end_time'],
});

interface BasicInfoFormData {
  title: string;
  start_time: Date | undefined;
  end_time: Date | undefined | null;
  all_day: boolean;
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
      all_day: false,
      timezone: 'America/Los_Angeles',
      status: 'DateHold',
      tags: [],
      notes: '',
    },
  });

  const isSubmitting = externalIsSubmitting || internalIsSubmitting;

  const computeEffectiveEnd = useCallback((data: BasicInfoFormData): string | undefined => {
    if (!data.start_time) return undefined;
    if (data.end_time) return data.end_time.toISOString();
    if (data.all_day) {
      return data.start_time.toISOString();
    }
    return new Date(data.start_time.getTime() + 4 * 60 * 60 * 1000).toISOString();
  }, []);

  const handleSave = useCallback(async (data: BasicInfoFormData) => {
    if (!gigId) return;
    if (!data.start_time) return;
    const effectiveEnd = computeEffectiveEnd(data);
    if (effectiveEnd && new Date(effectiveEnd) <= data.start_time) return;
    await updateGig(gigId, {
      title: data.title,
      start: data.start_time.toISOString(),
      end: effectiveEnd,
      timezone: data.timezone,
      status: data.status,
      tags: data.tags,
      notes: data.notes,
    });
  }, [gigId, computeEffectiveEnd]);

  const handleSaveSuccess = useCallback((data: BasicInfoFormData) => {
    reset(data, { keepDirty: false, keepValues: true });
  }, [reset]);

  const { saveState, triggerSave } = useAutoSave<BasicInfoFormData>({
    gigId: gigId || '',
    onSave: handleSave,
    onSuccess: handleSaveSuccess,
    debounceMs: 3000
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

      const startIsAllDay = gig.start ? isNoonUTC(gig.start) : false;
      const data = {
        title: gig.title || '',
        start_time: gig.start ? new Date(gig.start) : undefined,
        end_time: gig.end ? new Date(gig.end) : undefined,
        all_day: startIsAllDay,
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

            <div className="flex items-center gap-2 mb-1">
              <Controller
                name="all_day"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="all_day"
                    checked={field.value}
                    className="border-gray-400 data-[state=checked]:border-primary"
                    onCheckedChange={(checked) => {
                      const isAllDay = !!checked;
                      field.onChange(isAllDay);
                      const startVal = watch('start_time');
                      if (isAllDay && startVal) {
                        const dateStr = startVal.toISOString().substring(0, 10);
                        const noonUtc = new Date(`${dateStr}T12:00:00Z`);
                        setValue('start_time', noonUtc, { shouldDirty: true });
                        const endVal = watch('end_time');
                        if (endVal) {
                          const endDateStr = endVal.toISOString().substring(0, 10);
                          setValue('end_time', new Date(`${endDateStr}T12:00:00Z`), { shouldDirty: true });
                        }
                      } else if (!isAllDay && startVal && isNoonUTC(startVal.toISOString())) {
                        const dateStr = startVal.toISOString().substring(0, 10);
                        const utcIso = parseGigDateTimeFromInput(`${dateStr}T19:00`, watch('timezone'), false);
                        setValue('start_time', new Date(utcIso), { shouldDirty: true });
                        setValue('end_time', new Date(new Date(utcIso).getTime() + 4 * 60 * 60 * 1000), { shouldDirty: true });
                      }
                    }}
                    disabled={isSubmitting}
                  />
                )}
              />
              <Label htmlFor="all_day" className="text-sm font-normal cursor-pointer">All day</Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">
                  {watch('all_day') ? 'Start Date' : 'Start Date/Time'} <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="start_time"
                  control={control}
                  render={({ field }) => {
                    const formatted = formatGigDateTimeForInput(field.value || '', watch('timezone'));
                    const datePart = formatted.substring(0, 10);
                    const timePart = formatted.substring(11, 16);
                    const hour = timePart ? timePart.substring(0, 2) : '';
                    const minute = timePart ? timePart.substring(3, 5) : '';

                    const handleDateTimeChange = (newDate: string, newHour: string, newMinute: string) => {
                      if (!newDate) { field.onChange(undefined); return; }
                      const allDay = watch('all_day');
                      const inputVal = allDay ? newDate : `${newDate}T${newHour || '12'}:${newMinute || '00'}`;
                      const utcIso = parseGigDateTimeFromInput(inputVal, watch('timezone'), allDay);
                      if (utcIso) {
                        const newStart = new Date(utcIso);
                        const oldStart = field.value;
                        const currentEnd = watch('end_time');
                        field.onChange(newStart);
                        if (oldStart && currentEnd) {
                          if (allDay) {
                            const dayDiff = Math.round((currentEnd.getTime() - oldStart.getTime()) / 86400000);
                            setValue('end_time', new Date(newStart.getTime() + dayDiff * 86400000), { shouldDirty: true });
                          } else {
                            const durationMs = currentEnd.getTime() - oldStart.getTime();
                            setValue('end_time', new Date(newStart.getTime() + durationMs), { shouldDirty: true });
                          }
                        } else if (!currentEnd) {
                          if (allDay) {
                            setValue('end_time', new Date(utcIso), { shouldDirty: true });
                          } else {
                            setValue('end_time', new Date(newStart.getTime() + 4 * 60 * 60 * 1000), { shouldDirty: true });
                          }
                        }
                      }
                    };

                    return (
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="start_time"
                            type="date"
                            value={datePart}
                            onChange={(e) => handleDateTimeChange(e.target.value, hour, minute)}
                            className={`pl-9 ${errors.start_time ? 'border-red-500' : ''}`}
                            disabled={isSubmitting}
                          />
                        </div>
                        {!watch('all_day') && (
                          <>
                            <Select value={hour} onValueChange={(h) => handleDateTimeChange(datePart, h, minute)} disabled={isSubmitting}>
                              <SelectTrigger className="w-[70px]"><SelectValue placeholder="HH" /></SelectTrigger>
                              <SelectContent>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}</SelectContent>
                            </Select>
                            <span className="text-muted-foreground font-medium">:</span>
                            <Select value={minute} onValueChange={(m) => handleDateTimeChange(datePart, hour, m)} disabled={isSubmitting}>
                              <SelectTrigger className="w-[70px]"><SelectValue placeholder="MM" /></SelectTrigger>
                              <SelectContent>{['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}</SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                {errors.start_time && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.start_time.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">
                  {watch('all_day') ? 'End Date' : 'End Date/Time'}
                </Label>
                <Controller
                  name="end_time"
                  control={control}
                  render={({ field }) => {
                    const formatted = field.value ? formatGigDateTimeForInput(field.value, watch('timezone')) : '';
                    const datePart = formatted.substring(0, 10);
                    const timePart = formatted.substring(11, 16);
                    const hour = timePart ? timePart.substring(0, 2) : '';
                    const minute = timePart ? timePart.substring(3, 5) : '';

                    const handleDateTimeChange = (newDate: string, newHour: string, newMinute: string) => {
                      if (!newDate) { field.onChange(null); return; }
                      const allDay = watch('all_day');
                      const inputVal = allDay ? newDate : `${newDate}T${newHour || '12'}:${newMinute || '00'}`;
                      const utcIso = parseGigDateTimeFromInput(inputVal, watch('timezone'), allDay);
                      field.onChange(utcIso ? new Date(utcIso) : null);
                    };

                    return (
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="end_time"
                            type="date"
                            value={datePart}
                            onChange={(e) => handleDateTimeChange(e.target.value, hour, minute)}
                            className={`pl-9 ${errors.end_time ? 'border-red-500' : ''}`}
                            disabled={isSubmitting}
                          />
                        </div>
                        {!watch('all_day') && (
                          <>
                            <Select value={hour} onValueChange={(h) => handleDateTimeChange(datePart, h, minute)} disabled={isSubmitting}>
                              <SelectTrigger className="w-[70px]"><SelectValue placeholder="HH" /></SelectTrigger>
                              <SelectContent>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}</SelectContent>
                            </Select>
                            <span className="text-muted-foreground font-medium">:</span>
                            <Select value={minute} onValueChange={(m) => handleDateTimeChange(datePart, hour, m)} disabled={isSubmitting}>
                              <SelectTrigger className="w-[70px]"><SelectValue placeholder="MM" /></SelectTrigger>
                              <SelectContent>{['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}</SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                {!watch('all_day') && !watch('end_time') && watch('start_time') && (
                  <p className="text-xs text-muted-foreground">Defaults to start + 4 hours</p>
                )}
                {watch('all_day') && !watch('end_time') && watch('start_time') && (
                  <p className="text-xs text-muted-foreground">Defaults to start date</p>
                )}
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
