import { Tags } from 'lucide-react';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import CategoryListEditor from './CategoryListEditor';

interface CategoriesSettingsProps {
  /** The organization's lists, or null for the starter sets (platform moderators). */
  organizationId: string | null;
  canEdit: boolean;
  title?: string;
  description?: string;
}

/** Expense and equipment categories, one tab each. */
export default function CategoriesSettings({
  organizationId,
  canEdit,
  title = 'Categories',
  description = 'The choices offered when you record purchases and equipment.',
}: CategoriesSettingsProps) {
  return (
    <Card className="p-6 mt-6">
      <div className="flex items-start gap-3 mb-4">
        <Tags className="w-5 h-5 text-sky-700 mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense">Expense categories</TabsTrigger>
          <TabsTrigger value="equipment">Equipment categories</TabsTrigger>
        </TabsList>
        <TabsContent value="expense" className="mt-4">
          <CategoryListEditor kind="expense" organizationId={organizationId} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <CategoryListEditor kind="equipment" organizationId={organizationId} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
