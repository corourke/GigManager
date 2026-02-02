import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import ReactMarkdown from 'react-markdown';
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
              <ReactMarkdown
                components={{
                  // Style headings
                  h1: ({ node, ...props }) => <h1 className="text-gray-900 mt-6 mb-4" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-gray-900 mt-5 mb-3" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-gray-900 mt-4 mb-2" {...props} />,
                  h4: ({ node, ...props }) => <h4 className="text-gray-900 mt-3 mb-2" {...props} />,
                  h5: ({ node, ...props }) => <h5 className="text-gray-900 mt-3 mb-2" {...props} />,
                  h6: ({ node, ...props }) => <h6 className="text-gray-900 mt-3 mb-2" {...props} />,
                  // Style paragraphs
                  p: ({ node, ...props }) => <p className="text-gray-700 mb-4 leading-relaxed" {...props} />,
                  // Style lists
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 text-gray-700 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 text-gray-700 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-gray-700" {...props} />,
                  // Style links
                  a: ({ node, ...props }) => (
                    <a className="text-sky-600 hover:text-sky-700 underline" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  // Style code
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm" {...props} />
                    ) : (
                      <code className="block bg-gray-100 text-gray-800 p-3 rounded text-sm overflow-x-auto" {...props} />
                    ),
                  pre: ({ node, ...props }) => <pre className="mb-4" {...props} />,
                  // Style blockquotes
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4" {...props} />
                  ),
                  // Style strong/bold
                  strong: ({ node, ...props }) => <strong className="text-gray-900" {...props} />,
                  // Style emphasis/italic
                  em: ({ node, ...props }) => <em className="text-gray-700" {...props} />,
                  // Style horizontal rules
                  hr: ({ node, ...props }) => <hr className="my-6 border-gray-300" {...props} />,
                }}
              >
                {value}
              </ReactMarkdown>
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
