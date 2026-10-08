import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import MarkdownContent from './MarkdownContent';
import { Eye, Pencil } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter notes here... You can use **Markdown** formatting!',
  disabled = false
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2">
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="text-xs gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="m-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[300px] border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
            rows={12}
            onFocus={(e) => {
              const len = e.target.value.length;
              e.target.setSelectionRange(len, len);
            }}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div className="min-h-[300px] p-4 prose prose-sm max-w-none overflow-auto">
            {value ? (
              <MarkdownContent>{value}</MarkdownContent>
            ) : (
              <p className="text-gray-400 italic">Nothing to preview. Switch to Edit tab to add content.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Markdown Help */}
      <div className="bg-gray-50 border-t border-gray-300 px-3 py-2 text-xs text-gray-600">
        <span className="mr-4">**bold**</span>
        <span className="mr-4">*italic*</span>
        <span className="mr-4">[link](url)</span>
        <span className="mr-4">- list</span>
        <span># heading</span>
      </div>
    </div>
  );
}
