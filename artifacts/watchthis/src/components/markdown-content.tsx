import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * Renders markdown content with typography that matches the site's article
 * styling. Code blocks reuse the same visual language as <CodeBlock>.
 */
export function MarkdownContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) => (
          <a href={href} className="text-primary hover:underline" {...props}>
            {children}
          </a>
        ),
        table: ({ children }: { children?: ReactNode }) => (
          <div className="overflow-x-auto">
            <table>{children}</table>
          </div>
        ),
        pre: ({ children }: { children?: ReactNode }) => (
          <div className="not-prose relative rounded-lg bg-muted border border-border overflow-hidden my-6">
            <pre className="p-4 overflow-x-auto">{children}</pre>
          </div>
        ),
        code: ({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) => {
          const isBlock = /language-/.test(className ?? '');
          if (isBlock) {
            return (
              <code className={`text-sm font-mono text-foreground ${className ?? ''}`} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm text-foreground"
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
