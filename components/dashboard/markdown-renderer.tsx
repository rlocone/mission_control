"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Normalize markdown content to fix common formatting issues,
 * especially malformed tables that break rendering.
 * GFM tables require header, separator, and data rows to be consecutive (no blank lines).
 */
function normalizeMarkdown(content: string): string {
  if (!content) return '';
  
  let normalized = content;
  
  // First pass: Remove blank lines within table structures
  // GFM tables break if there are blank lines between rows
  const lines = normalized.split('\n');
  const fixedLines: string[] = [];
  let inTable = false;
  let tableBuffer: string[] = [];
  
  const isTableRow = (line: string) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
  };
  
  const isSeparatorRow = (line: string) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && /^\|[\s-:|]+\|$/.test(trimmed) && trimmed.includes('--');
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (isTableRow(trimmed) || isSeparatorRow(trimmed)) {
      // We're in a table
      if (!inTable) {
        inTable = true;
        tableBuffer = [];
      }
      tableBuffer.push(trimmed);
    } else if (inTable && trimmed === '') {
      // Blank line while in table - check if next non-blank line is also a table row
      let nextNonBlankIdx = i + 1;
      while (nextNonBlankIdx < lines.length && lines[nextNonBlankIdx].trim() === '') {
        nextNonBlankIdx++;
      }
      
      if (nextNonBlankIdx < lines.length && 
          (isTableRow(lines[nextNonBlankIdx].trim()) || isSeparatorRow(lines[nextNonBlankIdx].trim()))) {
        // Skip this blank line - table continues
        continue;
      } else {
        // Table ended - flush buffer
        fixedLines.push(...tableBuffer);
        tableBuffer = [];
        inTable = false;
        fixedLines.push(line);
      }
    } else {
      // Not a table row
      if (inTable) {
        // Flush table buffer
        fixedLines.push(...tableBuffer);
        tableBuffer = [];
        inTable = false;
      }
      fixedLines.push(line);
    }
  }
  
  // Flush any remaining table buffer
  if (tableBuffer.length > 0) {
    fixedLines.push(...tableBuffer);
  }
  
  normalized = fixedLines.join('\n');
  
  // Second pass: Ensure separator rows have proper formatting
  // Convert long dashes to proper GFM format (at least 3 dashes per cell)
  normalized = normalized.replace(
    /^\|[-:\s|]+\|$/gm,
    (match) => {
      // Split by pipe, clean up each cell
      const cells = match.split('|').slice(1, -1); // Remove empty first/last from split
      const fixedCells = cells.map(cell => {
        const trimmed = cell.trim();
        // Preserve alignment colons
        const leftAlign = trimmed.startsWith(':');
        const rightAlign = trimmed.endsWith(':') && trimmed.length > 1;
        
        if (leftAlign && rightAlign) return ':---:';
        if (leftAlign) return ':---';
        if (rightAlign) return '---:';
        return '---';
      });
      return '| ' + fixedCells.join(' | ') + ' |';
    }
  );
  
  return normalized;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const normalizedContent = normalizeMarkdown(content);
  
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings - with proper word wrapping to prevent mid-word breaks
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mt-6 mb-3 first:mt-0 break-words hyphens-none">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-white mt-5 mb-2 first:mt-0 border-b border-white/10 pb-2 break-words hyphens-none">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-cyan-400 mt-4 mb-2 break-words hyphens-none">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-medium text-gray-300 mt-3 mb-1 break-words hyphens-none">{children}</h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="text-gray-300 leading-relaxed mb-3">{children}</p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-4 ml-2 text-gray-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-4 ml-2 text-gray-300">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-300 leading-relaxed">{children}</li>
          ),
          
          // Links - styled prominently with external indicator
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              {children}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ),
          
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-gray-300">{children}</em>
          ),
          
          // Code blocks
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-slate-700 rounded text-cyan-300 text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-4 bg-slate-800 rounded-lg text-sm font-mono text-gray-300 overflow-x-auto">
                {children}
              </code>
            );
          },
          
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto">{children}</pre>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-cyan-500 pl-4 my-4 italic text-gray-400">
              {children}
            </blockquote>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-white/10 my-6" />
          ),
          
          // Tables - improved styling for readability
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4 rounded-lg border border-white/10">
              <table className="min-w-full divide-y divide-white/10">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-800/80">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/10 bg-slate-900/50">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/5 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2.5 text-sm text-gray-300 align-top">{children}</td>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
