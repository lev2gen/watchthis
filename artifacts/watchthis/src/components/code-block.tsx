import { ReactNode } from 'react';

type CodeBlockProps = {
  children: ReactNode;
  language?: string;
  className?: string;
};

export function CodeBlock({ children, language, className = '' }: CodeBlockProps) {
  return (
    <div className={`relative rounded-lg bg-muted border border-border overflow-hidden ${className}`}>
      {language && (
        <div className="px-4 py-2 text-xs font-mono text-muted-foreground border-b border-border bg-card">
          {language}
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-foreground">{children}</code>
      </pre>
    </div>
  );
}
