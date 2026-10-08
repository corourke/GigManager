import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  children: string;
}

/**
 * Renders Markdown notes with the app's styling. Shared by the MarkdownEditor
 * Preview tab and the read-only views of the same notes, so they look alike.
 * Raw HTML in the source is not rendered (react-markdown's default, no rehype-raw).
 */
export default function MarkdownContent({ children }: MarkdownContentProps) {
  return (
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
      {children}
    </ReactMarkdown>
  );
}
