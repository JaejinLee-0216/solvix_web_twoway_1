"use client";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  className?: string;
}

export default function MathRenderer({ text, className = "" }: MathRendererProps) {
  return (
    <div className={`text-[#111] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom styling for better appearance
          p: ({ children }) => <p className="mb-2 last:mb-0 text-[#111]">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-[#111]">{children}</strong>,
          em: ({ children }) => <em className="italic text-[#444]">{children}</em>,
          code: ({ children, className }) => {
            const isInline = !className?.includes('language-');
            return isInline ? (
              <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono text-[#111]">{children}</code>
            ) : (
              <code className={`${className ?? ''} text-[#111]`}>{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-100 text-[#111] p-4 rounded-lg overflow-x-auto text-sm">{children}</pre>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-[#111]">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-[#111]">{children}</ol>,
          li: ({ children }) => <li className="text-sm text-[#111]">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-[#111]">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-[#111]">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-[#111]">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-[#444] bg-gray-100/80 py-2 mb-2">
              {children}
            </blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
