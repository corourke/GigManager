import type { ReactNode } from 'react';
import { FormProvider, useFormContext } from 'react-hook-form';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import AttachmentManager from '../../AttachmentManager';
import GigScheduleEditor from '../GigScheduleEditor';
import GigSection from '../view/GigSection';
import { GigNotesField, GigWhenFields } from '../basicInfo/GigBasicInfoFields';
import { computeEffectiveEnd, useGigBasicInfoForm, type BasicInfoFormData } from '../basicInfo/useGigBasicInfoForm';
import { widenGigToSchedule, type ScheduleTimes } from '../../../utils/scheduleWindow';
import type { SaveState } from '../../../utils/hooks/useAutoSave';
import type { Gig } from '../../../utils/supabase/types';

// The pieces of the gig page's edit mode (#12). One basic-info form spans the
// header (title, status, tags), the When & schedule card and the Notes card.

/** Provides the gig's basic-info form, seeded from the gig the page loaded, to everything inside it. */
export function GigEditForm({ gigId, gig, children }: { gigId: string; gig: Gig; children: ReactNode }) {
  const { form } = useGigBasicInfoForm(gigId, gig);
  return <FormProvider {...form}>{children}</FormProvider>;
}

/** The page's one save state, in the edit header. */
export function EditSaveStatus({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin" />Saving…
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-700" aria-live="polite">
        <AlertCircle className="w-4 h-4" />Some changes didn't save
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-green-800" aria-live="polite">
      <Check className="w-4 h-4" />All changes saved
    </span>
  );
}

interface WhenAndScheduleProps {
  gigId: string;
  gigStart?: string | null;
  actParticipants: { id: string; organization?: { id: string; name: string } | null }[];
}

/**
 * All day, start, end and time zone above the schedule table. A schedule item
 * outside the gig widens the gig's start or end to cover it, except for an
 * all-day gig.
 */
export function WhenAndScheduleCard({ gigId, gigStart, actParticipants }: WhenAndScheduleProps) {
  const { getValues, setValue, watch } = useFormContext<BasicInfoFormData>();
  const timeZone = watch('timezone');

  const widen = (entries: ScheduleTimes[]) => {
    const values = getValues();
    if (!values.start_time) return;
    const wider = widenGigToSchedule(
      { start: values.start_time.toISOString(), end: computeEffectiveEnd(values)! },
      entries,
      values.all_day,
    );
    if (!wider) return;
    setValue('start_time', new Date(wider.start), { shouldDirty: true });
    setValue('end_time', new Date(wider.end), { shouldDirty: true });
  };

  return (
    <GigSection
      title="When & schedule"
      actions={
        <span className="text-xs text-muted-foreground hidden md:inline">
          A schedule time outside the gig moves its start or end to include it (not for all-day gigs).
        </span>
      }
    >
      <GigWhenFields layout="row" />
      <GigScheduleEditor
        gigId={gigId}
        gigStart={gigStart}
        timeZone={timeZone}
        actParticipants={actParticipants}
        onEntriesChange={widen}
      />
    </GigSection>
  );
}

/** The gig's notes (Markdown) and its attachments. */
export function NotesCard({ organizationId, gigId }: { organizationId: string; gigId: string }) {
  return (
    <GigSection title="Notes & attachments">
      <GigNotesField showLabel={false} />
      <AttachmentManager organizationId={organizationId} entityType="gig" entityId={gigId} title="" />
    </GigSection>
  );
}
