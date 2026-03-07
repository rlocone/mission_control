import { format } from 'date-fns';

interface AgentReport {
  agentName: string;
  agentRole: string;
  agentEmoji: string;
  taskName: string;
  content: string;
  summary: string;
  createdAt: string;
  shareUrl?: string;
}

// High-contrast colors for accessibility (WCAG AAA compliant on white)
const agentColors: Record<string, { primary: string; accent: string; headerBg: string }> = {
  'Rose': { primary: '#be185d', accent: '#9d174d', headerBg: '#fdf2f8' },
  'Cathy': { primary: '#6d28d9', accent: '#5b21b6', headerBg: '#f5f3ff' },
  'Ruthie': { primary: '#047857', accent: '#065f46', headerBg: '#ecfdf5' },
  'Sarah': { primary: '#b91c1c', accent: '#991b1b', headerBg: '#fef2f2' },
};

/**
 * Generates accessible PDF HTML with:
 * - Light background with high-contrast dark text
 * - Minimum 18px body font (WCAG recommendation for readability)
 * - Clear visual hierarchy with proper heading sizes
 * - High contrast ratio (minimum 7:1 for WCAG AAA)
 * - Clean, single-column layout for easy reading
 */
export function generateReportPdfHtml(report: AgentReport): string {
  const colors = agentColors[report.agentName] || agentColors['Rose'];
  const date = format(new Date(report.createdAt), 'MMMM d, yyyy');
  const time = format(new Date(report.createdAt), 'HH:mm:ss');
  
  const htmlContent = convertMarkdownToHtml(report.content, colors.primary);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.taskName} - ${report.agentName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&family=Source+Code+Pro:wght@400;500&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      font-size: 18px;
      line-height: 1.8;
      padding: 0;
    }
    
    .page {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.75in;
    }
    
    /* Header - clean and accessible */
    .header {
      background: ${colors.headerBg};
      border-bottom: 4px solid ${colors.primary};
      padding: 32px 40px;
      margin: -0.75in -0.75in 40px -0.75in;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    
    .mission-badge {
      font-size: 14px;
      font-weight: 600;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    
    .agent-info {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .agent-emoji { font-size: 48px; }
    
    .agent-details .agent-name {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .agent-details .agent-role {
      font-size: 16px;
      color: #4a4a4a;
      margin-top: 4px;
    }
    
    .report-title {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    
    .report-meta {
      font-size: 16px;
      color: #4a4a4a;
    }
    
    .report-meta span { margin-right: 24px; }
    
    /* Summary box - high visibility */
    .summary-box {
      background: #f8fafc;
      border-left: 6px solid ${colors.primary};
      padding: 24px 28px;
      margin-bottom: 36px;
    }
    
    .summary-label {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${colors.primary};
      margin-bottom: 12px;
    }
    
    .summary-text {
      font-size: 18px;
      color: #2a2a2a;
      line-height: 1.7;
    }
    
    /* Main content - optimized for readability */
    .report-content {
      font-size: 18px;
      color: #1a1a1a;
    }
    
    .report-content h1 {
      font-size: 28px;
      font-weight: 700;
      color: ${colors.primary};
      margin: 40px 0 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid ${colors.primary};
    }
    
    .report-content h2 {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 36px 0 16px;
    }
    
    .report-content h3 {
      font-size: 20px;
      font-weight: 600;
      color: #2a2a2a;
      margin: 28px 0 14px;
    }
    
    .report-content p {
      margin: 18px 0;
      color: #1a1a1a;
    }
    
    .report-content ul, .report-content ol {
      margin: 18px 0;
      padding-left: 32px;
    }
    
    .report-content li {
      margin: 12px 0;
      color: #1a1a1a;
    }
    
    .report-content strong {
      font-weight: 700;
      color: #000000;
    }
    
    .report-content a {
      color: ${colors.primary};
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    
    .report-content blockquote {
      border-left: 5px solid ${colors.primary};
      padding: 16px 24px;
      margin: 24px 0;
      background: #f8fafc;
      font-style: italic;
      color: #2a2a2a;
    }
    
    .report-content code {
      font-family: 'Source Code Pro', monospace;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 16px;
      color: #1a1a1a;
    }
    
    .report-content pre {
      background: #1e293b;
      padding: 24px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 24px 0;
    }
    
    .report-content pre code {
      background: none;
      padding: 0;
      color: #e2e8f0;
      font-size: 15px;
    }
    
    /* Tables - high contrast and readable */
    .report-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 28px 0;
      font-size: 16px;
    }
    
    .report-content th {
      background: ${colors.primary};
      color: #ffffff;
      padding: 16px 18px;
      text-align: left;
      font-weight: 700;
      font-size: 15px;
    }
    
    .report-content td {
      padding: 14px 18px;
      border: 1px solid #d1d5db;
      color: #1a1a1a;
      vertical-align: top;
    }
    
    .report-content tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .report-content tr:hover {
      background: #f3f4f6;
    }
    
    /* Footer */
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      color: #6b7280;
    }
    
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .footer-logo { font-size: 24px; }
    
    @media print {
      body { font-size: 12pt; }
      .page { padding: 0.5in; }
      .header { margin: -0.5in -0.5in 24px -0.5in; padding: 24px 32px; }
      .report-content { font-size: 12pt; }
      .report-content h1 { font-size: 18pt; }
      .report-content h2 { font-size: 16pt; }
      .report-content h3 { font-size: 14pt; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="header-top">
        <div class="agent-info">
          <span class="agent-emoji">${report.agentEmoji}</span>
          <div class="agent-details">
            <div class="agent-name">${report.agentName}</div>
            <div class="agent-role">${report.agentRole}</div>
          </div>
        </div>
        <div class="mission-badge">🎯 Mission Control</div>
      </div>
      <h1 class="report-title">${report.taskName}</h1>
      <div class="report-meta">
        <span>📅 ${date}</span>
        <span>🕐 ${time} UTC</span>
      </div>
    </header>
    
    <main>
      ${report.summary ? `
      <div class="summary-box">
        <div class="summary-label">Executive Summary</div>
        <div class="summary-text">${report.summary}</div>
      </div>
      ` : ''}
      
      <div class="report-content">
        ${htmlContent}
      </div>
    </main>
    
    <footer class="footer">
      <div class="footer-brand">
        <span class="footer-logo">🌹</span>
        <div>Mission Control Dashboard • Powered by Abacus AI</div>
      </div>
      ${report.shareUrl ? `
      <div class="share-links" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Share this report:</div>
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(report.shareUrl)}" 
             style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #1877F2; color: white; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500;">
            📘 Facebook
          </a>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(report.taskName + ' by ' + report.agentName)}&url=${encodeURIComponent(report.shareUrl)}" 
             style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #1DA1F2; color: white; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500;">
            🐦 X/Twitter
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(report.shareUrl)}" 
             style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #0A66C2; color: white; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500;">
            💼 LinkedIn
          </a>
          <span style="font-size: 11px; color: #9ca3af;">🔗 ${report.shareUrl}</span>
        </div>
      </div>
      ` : ''}
      <div style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Generated ${format(new Date(), 'PPpp')}</div>
    </footer>
  </div>
</body>
</html>
`;
}

/**
 * Remove blank lines within markdown tables to ensure proper GFM parsing.
 * LLMs sometimes generate tables with blank lines between rows.
 */
function normalizeTableBlankLines(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const isTableRow = (line: string) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
  };

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      result.push(...tableBuffer);
      tableBuffer = [];
    }
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isTableRow(line)) {
      inTable = true;
      tableBuffer.push(line);
    } else if (inTable && trimmed === '') {
      // Check if next non-empty line is a table row
      let nextIdx = i + 1;
      while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
      if (nextIdx < lines.length && isTableRow(lines[nextIdx])) {
        // Skip blank line within table
        continue;
      } else {
        flushTable();
        result.push(line);
      }
    } else {
      if (inTable) flushTable();
      result.push(line);
    }
  }

  if (inTable) flushTable();
  return result.join('\n');
}

/**
 * Robust markdown-to-HTML converter for PDF generation.
 * Handles edge cases like malformed tables, mixed formats, and LLM-generated content.
 */
function convertMarkdownToHtml(markdown: string, primaryColor: string = '#6d28d9'): string {
  // ========== STEP 0: REMOVE BLANK LINES WITHIN TABLES ==========
  // LLMs sometimes generate tables with blank lines between rows, which breaks GFM parsing
  let html = normalizeTableBlankLines(markdown);
  
  // ========== STEP 1: PRE-PROCESS TABLES ==========
  // Handle various table formats that LLMs produce
  
  // Fix tables where rows are on single lines (broken formatting)
  // Pattern: "| Header1 | Header2 | |---|---| | data1 | data2 |"
  html = html.replace(/\|([^|\n]+\|)+\s*\|[-:\s|]+\|\s*(\|[^|\n]+\|)+/g, (match) => {
    // Split into rows by finding pipe patterns
    const parts = match.split(/\s*\|\s*\|\s*/).join('\n|').split(/\|\s+\|/).join('|\n|');
    return parts;
  });
  
  // Normalize table separators (handle variations like |---| or | --- | or |:---:|)
  html = html.replace(/\|[\s:-]+\|/g, (match) => {
    return match.replace(/\s+/g, '').replace(/:?-+:?/g, '---');
  });
  
  // Parse markdown tables into HTML tables
  // Improved regex to catch more table variations
  html = html.replace(/(?:^|\n)((?:\|[^\n]+\|\n?)+)/gm, (match, tableBlock) => {
    const lines = tableBlock.trim().split('\n').filter((l: string) => l.trim().startsWith('|'));
    
    if (lines.length < 2) return match; // Not a valid table
    
    // Check if second line is separator
    const separatorRegex = /^\|[\s:-]+(\|[\s:-]+)*\|?$/;
    const hasSeparator = lines.length >= 2 && separatorRegex.test(lines[1].trim());
    
    if (!hasSeparator) return match; // Not a valid markdown table
    
    const parseRow = (row: string): string[] => {
      return row.split('|')
        .map((cell: string) => cell.trim())
        .filter((cell: string, idx: number, arr: string[]) => idx > 0 && idx < arr.length - 1 || cell);
    };
    
    const headerCells = parseRow(lines[0]);
    const dataRows = lines.slice(2).map((row: string) => parseRow(row));
    
    if (headerCells.length === 0) return match;
    
    let tableHtml = '<table><thead><tr>';
    headerCells.forEach((h: string) => { 
      // Clean any markdown formatting in headers
      const cleanHeader = h.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
      tableHtml += `<th>${cleanHeader}</th>`; 
    });
    tableHtml += '</tr></thead><tbody>';
    
    dataRows.forEach((row: string[]) => {
      if (row.length > 0 && !separatorRegex.test(row.join('|'))) {
        tableHtml += '<tr>';
        row.forEach((cell: string) => { 
          // Process cell content for links and formatting
          let cellContent = cell;
          // Handle markdown links in cells
          cellContent = cellContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
          // Handle standalone URLs (not already in href)
          cellContent = cellContent.replace(/(?<!href=")(https?:\/\/[^\s<"]+)/g, (match, url) => {
            const displayUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
            return `<a href="${url}">${displayUrl}</a>`;
          });
          // Handle bold
          cellContent = cellContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          // Handle inline code
          cellContent = cellContent.replace(/`([^`]+)`/g, '<code>$1</code>');
          tableHtml += `<td>${cellContent}</td>`; 
        });
        tableHtml += '</tr>';
      }
    });
    tableHtml += '</tbody></table>';
    return '\n' + tableHtml + '\n';
  });
  
  // ========== STEP 2: HEADERS ==========
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // ========== STEP 3: CODE BLOCKS (before other processing to protect content) ==========
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  
  // ========== STEP 4: LINKS ==========
  // Process markdown links [text](url) - must come before standalone URL handling
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    // Clean URL - remove any accidental quotes or attributes that got included
    const cleanUrl = url.split('"')[0].split("'")[0].trim();
    return `<a href="${cleanUrl}">${text}</a>`;
  });
  
  // Process standalone URLs - only if not already in an href
  // Use a placeholder approach to avoid double-processing
  const urlPlaceholders: { [key: string]: string } = {};
  let placeholderIndex = 0;
  
  html = html.replace(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g, (match) => {
    const placeholder = `___LINK_PLACEHOLDER_${placeholderIndex++}___`;
    urlPlaceholders[placeholder] = match;
    return placeholder;
  });
  
  // Now convert standalone URLs
  html = html.replace(/(https?:\/\/[^\s<>"',\)]+)/g, (match) => {
    // Don't process if it looks like it's part of a placeholder or already processed
    if (match.includes('PLACEHOLDER')) return match;
    // Clean trailing punctuation
    const cleanUrl = match.replace(/[.,;:!?\)]+$/, '');
    return `<a href="${cleanUrl}">${cleanUrl}</a>`;
  });
  
  // Restore link placeholders
  Object.keys(urlPlaceholders).forEach(placeholder => {
    html = html.replace(placeholder, urlPlaceholders[placeholder]);
  });
  
  // ========== STEP 5: BOLD AND ITALIC ==========
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  
  // ========== STEP 6: BLOCKQUOTES ==========
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
  
  // ========== STEP 7: LISTS ==========
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  
  // Wrap consecutive list items in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => {
    return '<ul>' + match.trim() + '</ul>';
  });
  
  // ========== STEP 8: HORIZONTAL RULES ==========
  html = html.replace(/^---+$/gm, '<hr>');
  html = html.replace(/^\*\*\*+$/gm, '<hr>');
  
  // ========== STEP 9: PARAGRAPHS ==========
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    // Don't wrap if empty, already HTML, or special elements
    if (!trimmed || 
        trimmed.startsWith('<') || 
        trimmed.endsWith('>') ||
        trimmed.includes('___') // placeholders
    ) {
      return line;
    }
    return `<p>${trimmed}</p>`;
  });
  html = processedLines.join('\n');
  
  // ========== STEP 10: CLEANUP ==========
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<\/p>/g, '');
  // Fix any doubled-up paragraph tags
  html = html.replace(/<p><p>/g, '<p>');
  html = html.replace(/<\/p><\/p>/g, '</p>');
  // Clean up multiple line breaks
  html = html.replace(/\n{3,}/g, '\n\n');
  
  return html;
}

/**
 * Combined report with accessibility-first design:
 * - White background for maximum contrast
 * - Large, readable fonts (18px+ body text)
 * - Clear section separators
 * - High-contrast tables with visible borders
 */
export function generateCombinedReportHtml(reports: AgentReport[]): string {
  const date = format(new Date(), 'MMMM d, yyyy');
  
  const reportsHtml = reports.map((report, index) => {
    const colors = agentColors[report.agentName] || agentColors['Rose'];
    const htmlContent = convertMarkdownToHtml(report.content, colors.primary);
    const reportTime = format(new Date(report.createdAt), 'HH:mm:ss');
    
    return `
    <section class="report-section" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
      <header class="section-header" style="background: ${colors.headerBg}; border-left: 6px solid ${colors.primary};">
        <div class="section-header-content">
          <div class="agent-row">
            <span class="agent-emoji">${report.agentEmoji}</span>
            <div class="agent-info">
              <div class="agent-name">${report.agentName}</div>
              <div class="agent-role">${report.agentRole}</div>
            </div>
          </div>
          <h2 class="section-title">${report.taskName}</h2>
          <div class="section-meta">🕐 ${reportTime} UTC</div>
        </div>
      </header>
      
      ${report.summary ? `
      <div class="summary-box">
        <div class="summary-label">Executive Summary</div>
        <div class="summary-text">${report.summary}</div>
      </div>
      ` : ''}
      
      <div class="report-content">
        ${htmlContent}
      </div>
    </section>
    `;
  }).join('<hr class="section-divider">');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Control Daily Briefing - ${date}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&family=Source+Code+Pro:wght@400;500&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      font-size: 18px;
      line-height: 1.8;
    }
    
    .page {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.75in;
    }
    
    /* Cover page */
    .cover {
      text-align: center;
      padding: 60px 40px;
      background: linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #ecfdf5 100%);
      border-bottom: 4px solid #6d28d9;
      margin: -0.75in -0.75in 40px -0.75in;
    }
    
    .cover-logo { font-size: 72px; margin-bottom: 16px; }
    .cover-title { font-size: 42px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    .cover-subtitle { font-size: 22px; color: #4a4a4a; margin-bottom: 20px; }
    .cover-date { font-size: 18px; color: #1a1a1a; font-weight: 600; }
    
    .agents-strip {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 32px;
    }
    
    .agent-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #ffffff;
      border: 2px solid #d1d5db;
      border-radius: 24px;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    /* Section headers */
    .report-section { margin-bottom: 48px; }
    
    .section-header {
      padding: 28px 32px;
      margin-bottom: 28px;
    }
    
    .agent-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    
    .agent-emoji { font-size: 40px; }
    
    .agent-info .agent-name {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .agent-info .agent-role {
      font-size: 15px;
      color: #4a4a4a;
    }
    
    .section-title {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    
    .section-meta {
      font-size: 15px;
      color: #4a4a4a;
    }
    
    /* Summary */
    .summary-box {
      background: #f8fafc;
      border-left: 5px solid #6d28d9;
      padding: 20px 24px;
      margin-bottom: 28px;
    }
    
    .summary-label {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6d28d9;
      margin-bottom: 10px;
    }
    
    .summary-text {
      font-size: 17px;
      color: #2a2a2a;
      line-height: 1.7;
    }
    
    /* Report content */
    .report-content {
      font-size: 18px;
      color: #1a1a1a;
    }
    
    .report-content h1 {
      font-size: 26px;
      font-weight: 700;
      color: #6d28d9;
      margin: 36px 0 18px;
      padding-bottom: 10px;
      border-bottom: 3px solid #6d28d9;
    }
    
    .report-content h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 32px 0 14px;
    }
    
    .report-content h3 {
      font-size: 19px;
      font-weight: 600;
      color: #2a2a2a;
      margin: 26px 0 12px;
    }
    
    .report-content p {
      margin: 16px 0;
      color: #1a1a1a;
    }
    
    .report-content ul, .report-content ol {
      margin: 16px 0;
      padding-left: 32px;
    }
    
    .report-content li {
      margin: 10px 0;
      color: #1a1a1a;
    }
    
    .report-content strong {
      font-weight: 700;
      color: #000000;
    }
    
    .report-content a {
      color: #6d28d9;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    
    .report-content blockquote {
      border-left: 5px solid #6d28d9;
      padding: 14px 20px;
      margin: 20px 0;
      background: #f8fafc;
      font-style: italic;
      color: #2a2a2a;
    }
    
    .report-content code {
      font-family: 'Source Code Pro', monospace;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 16px;
      color: #1a1a1a;
    }
    
    .report-content pre {
      background: #1e293b;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
    }
    
    .report-content pre code {
      background: none;
      padding: 0;
      color: #e2e8f0;
      font-size: 15px;
    }
    
    .report-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 16px;
    }
    
    .report-content th {
      background: #6d28d9;
      color: #ffffff;
      padding: 14px 16px;
      text-align: left;
      font-weight: 700;
      font-size: 15px;
    }
    
    .report-content td {
      padding: 12px 16px;
      border: 1px solid #d1d5db;
      color: #1a1a1a;
      vertical-align: top;
    }
    
    .report-content tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .section-divider {
      border: none;
      border-top: 3px solid #e5e7eb;
      margin: 48px 0;
    }
    
    /* Footer */
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    
    @media print {
      body { font-size: 11pt; }
      .page { padding: 0.5in; }
      .cover { margin: -0.5in -0.5in 24px -0.5in; padding: 40px 32px; }
      .report-content { font-size: 11pt; }
      .report-content h1 { font-size: 16pt; }
      .report-content h2 { font-size: 14pt; }
      .report-content h3 { font-size: 12pt; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="cover">
      <div class="cover-logo">🎯</div>
      <h1 class="cover-title">Mission Control</h1>
      <div class="cover-subtitle">Daily Intelligence Briefing</div>
      <div class="cover-date">📅 ${date}</div>
      <div class="agents-strip">
        ${reports.map(r => `<div class="agent-chip">${r.agentEmoji} ${r.agentName}</div>`).join('')}
      </div>
    </header>
    
    <main>
      ${reportsHtml}
    </main>
    
    <footer class="footer">
      🌹 Mission Control Dashboard • Powered by Abacus AI • Generated ${format(new Date(), 'PPpp')}
    </footer>
  </div>
</body>
</html>
`;
}
