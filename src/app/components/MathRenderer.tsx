"use client";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text: string;
  className?: string;
  colorScheme?: "light" | "dark";
}

export default function MathRenderer({ text, className = "", colorScheme = "light" }: MathRendererProps) {
  const isDark = colorScheme === "dark";
  const primaryTextClass = isDark ? "text-white" : "text-[#111]";
  const secondaryTextClass = isDark ? "text-white/80" : "text-[#444]";
  const codeInlineClass = isDark
    ? "bg-white/10 border border-white/10 text-white"
    : "bg-gray-200 text-[#111]";
  const preClass = isDark
    ? "bg-white/5 text-white border border-white/10"
    : "bg-gray-100 text-[#111]";
  const listClass = primaryTextClass;
  const headingClass = primaryTextClass;
  const blockquoteClass = isDark
    ? "border-l-4 border-white/20 pl-4 italic text-white/90 bg-white/5 py-2 mb-2"
    : "border-l-4 border-gray-300 pl-4 italic text-[#444] bg-gray-100/80 py-2 mb-2";

  return (
    <div className={`${primaryTextClass} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className={`mb-2 last:mb-0 ${primaryTextClass}`}>{children}</p>,
          strong: ({ children }) => <strong className={`font-bold ${primaryTextClass}`}>{children}</strong>,
          em: ({ children }) => <em className={`italic ${secondaryTextClass}`}>{children}</em>,
          code: ({ children, className }) => {
            const isInline = !className?.includes('language-');
            return isInline ? (
              <code className={`px-1 py-0.5 rounded text-xs font-mono ${codeInlineClass}`}>{children}</code>
            ) : (
              <code className={`${className ?? ''} ${primaryTextClass}`}>{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className={`${preClass} p-4 rounded-lg overflow-x-auto text-sm`}>{children}</pre>
          ),
          ul: ({ children }) => <ul className={`list-disc list-inside mb-2 space-y-1 ${listClass}`}>{children}</ul>,
          ol: ({ children }) => <ol className={`list-decimal list-inside mb-2 space-y-1 ${listClass}`}>{children}</ol>,
          li: ({ children }) => <li className={`text-sm ${primaryTextClass}`}>{children}</li>,
          h1: ({ children }) => <h1 className={`text-xl font-bold mb-2 ${headingClass}`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`text-lg font-bold mb-2 ${headingClass}`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`text-base font-bold mb-2 ${headingClass}`}>{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className={blockquoteClass}>{children}</blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
