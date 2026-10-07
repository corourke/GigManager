import { useRef } from 'react';
import { FormProvider } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { TagsInputHandle } from '../TagsInput';
import SaveStateIndicator from './SaveStateIndicator';
import { useGigBasicInfoForm, type BasicInfoFormData } from './basicInfo/useGigBasicInfoForm';
import {
  GigNotesField,
  GigStatusField,
  GigTagsField,
  GigTitleField,
  GigWhenFields,
} from './basicInfo/GigBasicInfoFields';

interface GigBasicInfoSectionProps {
  gigId?: string;
  onCreate?: (data: BasicInfoFormData) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * The gig's basic info in one card: the create screen's form, or (with a
 * gigId) an autosaving editor. The gig page lays the same fields out itself.
 */
export default function GigBasicInfoSection({ gigId, onCreate, isSubmitting: externalIsSubmitting }: GigBasicInfoSectionProps) {
  const isCreateMode = !gigId;
  const tagsInputRef = useRef<TagsInputHandle>(null);
  const { form, isLoading, saveState } = useGigBasicInfoForm(gigId);
  const isSubmitting = externalIsSubmitting || form.formState.isSubmitting;

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
        {/* The page title says "New Gig" (#39); the card doesn't repeat it. */}
        <CardTitle>Basic Information</CardTitle>
        <div className="flex items-center gap-2">
          {!isCreateMode && <SaveStateIndicator state={saveState} />}
        </div>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form
            id="gig-basic-info-form"
            onSubmit={isCreateMode ? (e) => {
              // Commit any tag text still sitting in the input (not yet
              // Enter-committed) before validating/submitting, so it isn't
              // silently discarded.
              tagsInputRef.current?.commitPending();
              return form.handleSubmit(onCreate!)(e);
            } : (e) => e.preventDefault()}
          >
            <div className="space-y-6">
              <GigTitleField disabled={isSubmitting} />
              <GigWhenFields disabled={isSubmitting} />
              <GigStatusField disabled={isSubmitting} />
              <GigTagsField disabled={isSubmitting} inputRef={tagsInputRef} />
              <GigNotesField disabled={isSubmitting} />
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
