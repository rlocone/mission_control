import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { isValidEmail, isValidUUIDArray, validationError } from '@/lib/validation';
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const agentMeta: Record<string, { emoji: string; role: string; color: string }> = {
  'Rose': { emoji: '🌹', role: 'Supervisor & Executive Compiler', color: '#ec4899' },
  'Cathy': { emoji: '🔬', role: 'AI Research Specialist', color: '#8b5cf6' },
  'Ruthie': { emoji: '💊', role: 'Medical Research Specialist', color: '#10b981' },
  'Sarah': { emoji: '🔐', role: 'Cybersecurity Intelligence Specialist', color: '#ef4444' },
};

/**
 * Normalize markdown tables by removing blank lines between rows
 * and ensuring proper GFM format (same logic as markdown-renderer.tsx)
 */
function normalizeMarkdownTables(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const isTableRow = (line: string) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
  };

  const isSeparatorRow = (line: string) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && /^[\s|:-]+$/.test(trimmed);
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
      if (isSeparatorRow(line)) {
        // Normalize separator row
        const cells = trimmed.split('|').filter(c => c.trim() !== '');
        const normalizedCells = cells.map(cell => {
          const t = cell.trim();
          if (t.startsWith(':') && t.endsWith(':')) return ':---:';
          if (t.startsWith(':')) return ':---';
          if (t.endsWith(':')) return '---:';
          return '---';
        });
        tableBuffer.push('| ' + normalizedCells.join(' | ') + ' |');
      } else {
        tableBuffer.push(line);
      }
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

function convertMarkdownToHtml(markdown: string): string {
  // First normalize tables
  let html = normalizeMarkdownTables(markdown);
  
  // Convert tables to HTML
  html = convertTablesToHtml(html);
  
  // Headers
  html = html.replace(/^#### (.*$)/gm, '<h4 style="color: #c4b5fd; font-size: 16px; margin: 18px 0 8px;">$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3 style="color: #a78bfa; font-size: 18px; margin: 20px 0 10px;">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 style="color: #8b5cf6; font-size: 22px; margin: 24px 0 12px;">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 style="color: #c4b5fd; font-size: 26px; margin: 28px 0 14px; border-bottom: 2px solid #6366f130; padding-bottom: 10px;">$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f1f5f9;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #818cf8; text-decoration: none; border-bottom: 1px solid #818cf880;" target="_blank">$1</a>');
  
  // Standalone URLs (but not already in href)
  html = html.replace(/(?<!href=")(https?:\/\/[^\s<"]+)/g, (match, url) => {
    return `<a href="${url}" style="color: #818cf8; text-decoration: none;" target="_blank">${url}</a>`;
  });
  
  // Lists
  html = html.replace(/^\* (.*$)/gm, '<li style="margin: 6px 0; color: #cbd5e1;">$1</li>');
  html = html.replace(/^- (.*$)/gm, '<li style="margin: 6px 0; color: #cbd5e1;">$1</li>');
  html = html.replace(/^\d+\. (.*$)/gm, '<li style="margin: 6px 0; color: #cbd5e1;">$1</li>');
  
  // Wrap consecutive list items
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
    return '<ul style="margin: 14px 0; padding-left: 24px;">' + match + '</ul>';
  });
  
  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid #8b5cf6; padding: 12px 16px; margin: 16px 0; background: #8b5cf610; border-radius: 0 8px 8px 0; color: #94a3b8; font-style: italic;">$1</blockquote>');
  
  // Code
  html = html.replace(/`([^`]+)`/g, '<code style="background: #1f2937; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #f472b6;">$1</code>');
  
  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr style="border: none; border-top: 1px solid #374151; margin: 24px 0;">');
  
  // Paragraphs (skip lines that are already HTML or empty)
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('<') && !trimmed.endsWith('>') && !trimmed.match(/^<[^>]+>.*<\/[^>]+>$/)) {
      return `<p style="margin: 14px 0; color: #cbd5e1; line-height: 1.7;">${trimmed}</p>`;
    }
    return line;
  });
  html = processedLines.join('\n');
  
  // Clean up
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  return html;
}

/**
 * Convert markdown tables to styled HTML tables for email
 */
function convertTablesToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is a table header row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [line];
      i++;

      // Collect all consecutive table rows
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (nextLine.startsWith('|') && nextLine.endsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        } else if (nextLine === '') {
          // Skip blank lines in table
          i++;
        } else {
          break;
        }
      }

      // Convert table lines to HTML
      if (tableLines.length >= 2) {
        const htmlTable = convertTableLinesToHtml(tableLines);
        result.push(htmlTable);
      } else {
        result.push(...tableLines);
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

/**
 * Process cell content - convert markdown formatting to HTML
 */
function processCellContent(cell: string): string {
  let content = cell;
  
  // Handle markdown links [text](url)
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
    '<a href="$2" style="color: #60a5fa; text-decoration: underline;">$1</a>');
  
  // Handle standalone URLs (but not already in href)
  content = content.replace(/(?<!href=")(https?:\/\/[^\s<"]+)/g, (match, url) => {
    // Truncate display URL for readability
    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    return `<a href="${url}" style="color: #60a5fa; text-decoration: underline;">${displayUrl}</a>`;
  });
  
  // Handle bold
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f1f5f9;">$1</strong>');
  
  // Handle inline code
  content = content.replace(/`([^`]+)`/g, 
    '<code style="background: #1f2937; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 12px; color: #f472b6;">$1</code>');
  
  return content;
}

function convertTableLinesToHtml(tableLines: string[]): string {
  // Filter out separator rows and parse cells
  const dataRows: string[][] = [];
  let headerRow: string[] | null = null;

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    const cells = line.split('|').slice(1, -1).map(c => c.trim());

    // Check if this is a separator row (contains only dashes, colons, spaces)
    if (/^[\s|:-]+$/.test(line.replace(/\|/g, ''))) {
      continue; // Skip separator
    }

    if (headerRow === null) {
      headerRow = cells;
    } else {
      dataRows.push(cells);
    }
  }

  if (!headerRow) return tableLines.join('\n');

  // Build HTML table
  const tableStyle = 'width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;';
  const thStyle = 'background: linear-gradient(135deg, #1e293b, #0f172a); color: #22d3ee; padding: 12px; text-align: left; border: 1px solid #334155; font-weight: 600;';
  const tdStyle = 'padding: 10px 12px; border: 1px solid #334155; color: #cbd5e1;';
  const trEvenStyle = 'background: #1e293b;';
  const trOddStyle = 'background: #0f172a;';

  let html = `<table style="${tableStyle}">`;
  
  // Header - process formatting in headers too
  html += '<thead><tr>';
  for (const cell of headerRow) {
    const processedCell = processCellContent(cell);
    html += `<th style="${thStyle}">${processedCell}</th>`;
  }
  html += '</tr></thead>';

  // Body - process cell content for links, bold, code
  html += '<tbody>';
  for (let i = 0; i < dataRows.length; i++) {
    const rowStyle = i % 2 === 0 ? trEvenStyle : trOddStyle;
    html += `<tr style="${rowStyle}">`;
    for (const cell of dataRows[i]) {
      const processedCell = processCellContent(cell);
      html += `<td style="${tdStyle}">${processedCell}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

function generateEmailHtml(
  reports: Array<{
    agentName: string;
    agentRole: string;
    agentEmoji: string;
    agentColor: string;
    taskName: string;
    content: string;
    summary: string | null;
    createdAt: string;
    shareUrl: string;
    pdfUrl?: string;
  }>,
  baseUrl: string
): string {
  const date = format(new Date(), 'MMMM d, yyyy');
  
  const reportsHtml = reports.map(report => {
    const htmlContent = convertMarkdownToHtml(report.content);
    const time = format(new Date(report.createdAt), 'HH:mm');
    
    return `
    <div style="margin-bottom: 40px; border: 1px solid #374151; border-radius: 16px; overflow: hidden;">
      <!-- Report Header -->
      <div style="background: linear-gradient(135deg, ${report.agentColor}40, ${report.agentColor}15); padding: 24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="60" valign="top">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, ${report.agentColor}, ${report.agentColor}80); border-radius: 12px; text-align: center; line-height: 56px; font-size: 28px;">
                ${report.agentEmoji}
              </div>
            </td>
            <td style="padding-left: 16px;">
              <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #ffffff;">${report.taskName}</h2>
              <p style="margin: 0; font-size: 14px; color: ${report.agentColor}; font-weight: 600;">
                ${report.agentName} &bull; <span style="color: #9ca3af; font-weight: 400;">${report.agentRole}</span>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">🕐 ${time} UTC</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Summary -->
      ${report.summary ? `
      <div style="margin: 20px; padding: 16px; background: linear-gradient(135deg, #6366f115, #8b5cf615); border: 1px solid #6366f130; border-radius: 12px;">
        <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #a78bfa; font-weight: 600;">Executive Summary</p>
        <p style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.6;">${report.summary}</p>
      </div>
      ` : ''}
      
      <!-- Content -->
      <div style="padding: 20px; font-size: 14px;">
        ${htmlContent}
      </div>
      
      <!-- Actions -->
      <div style="padding: 20px; background: #111827; border-top: 1px solid #1f2937;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <a href="${report.shareUrl}" style="display: inline-block; padding: 10px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 500;">
                🔗 View Online
              </a>
            </td>
            ${report.pdfUrl ? `
            <td style="padding-left: 12px;">
              <a href="${report.pdfUrl}" style="display: inline-block; padding: 10px 20px; background: linear-gradient(135deg, #ec4899, #f472b6); color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 500;">
                📄 Download PDF
              </a>
            </td>
            ` : ''}
          </tr>
        </table>
        
        <!-- Social Share Links -->
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1f2937;">
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280;">Share this report:</p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(report.shareUrl)}" 
                   style="display: inline-block; padding: 8px 14px; background: #1877F2; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
                  📘 Facebook
                </a>
              </td>
              <td style="padding-left: 8px;">
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(report.taskName + ' by ' + report.agentName)}&url=${encodeURIComponent(report.shareUrl)}" 
                   style="display: inline-block; padding: 8px 14px; background: #1DA1F2; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
                  🐦 X/Twitter
                </a>
              </td>
              <td style="padding-left: 8px;">
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(report.shareUrl)}" 
                   style="display: inline-block; padding: 8px 14px; background: #0A66C2; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
                  💼 LinkedIn
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
    `;
  }).join('');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mission Control Daily Briefing</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0f0f1a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 700px;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 40px;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
              <h1 style="margin: 0 0 8px 0; font-size: 32px; color: #ffffff; font-weight: 700;">Mission Control</h1>
              <p style="margin: 0 0 20px 0; font-size: 18px; color: #9ca3af;">Daily Intelligence Briefing</p>
              <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 20px;">
                <span style="color: white; font-size: 14px; font-weight: 500;">📅 ${date}</span>
              </div>
            </td>
          </tr>
          
          <!-- Agent Pills -->
          <tr>
            <td style="text-align: center; padding-bottom: 40px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  ${reports.map(r => `
                  <td style="padding: 0 8px;">
                    <div style="display: inline-block; padding: 8px 16px; background: ${r.agentColor}20; border: 1px solid ${r.agentColor}40; border-radius: 20px;">
                      <span style="color: ${r.agentColor}; font-size: 13px; font-weight: 500;">${r.agentEmoji} ${r.agentName}</span>
                    </div>
                  </td>
                  `).join('')}
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Reports -->
          <tr>
            <td>
              ${reportsHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding-top: 40px; border-top: 1px solid #1f2937;">
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 14px;">
                🌹 Mission Control Dashboard
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Powered by Abacus AI
              </p>
              <p style="margin: 16px 0 0 0;">
                <a href="${baseUrl}" style="color: #818cf8; font-size: 13px; text-decoration: none;">
                  View Dashboard →
                </a>
              </p>
              <!-- RSS Feed Links -->
              <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #1f2937;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 11px;">Subscribe to RSS Feeds:</p>
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="padding: 0 6px;">
                      <a href="${baseUrl}/api/feeds/all.xml" style="color: #f97316; font-size: 11px; text-decoration: none;">📡 All Reports</a>
                    </td>
                    <td style="padding: 0 6px;">
                      <a href="${baseUrl}/api/feeds/rose.xml" style="color: #ec4899; font-size: 11px; text-decoration: none;">🌹 Rose</a>
                    </td>
                    <td style="padding: 0 6px;">
                      <a href="${baseUrl}/api/feeds/war-room.xml" style="color: #ef4444; font-size: 11px; text-decoration: none;">🔐 War Room</a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function POST(request: NextRequest) {
  // Rate limiting for email sending (expensive operation)
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "reports:email", RATE_LIMITS.expensive);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const { recipientEmail, outputIds, includeExecutiveSummary = true } = await request.json();

    // Validate email format
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return validationError('Valid recipientEmail is required');
    }

    // Validate outputIds
    if (!isValidUUIDArray(outputIds)) {
      return validationError('outputIds must be a non-empty array of valid UUIDs (max 50)');
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://rose.abacusai.app';

    // Fetch outputs
    const outputs = await prisma.output.findMany({
      where: { id: { in: outputIds } },
      include: {
        agent: { select: { name: true } },
        task: { select: { taskName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (outputs.length === 0) {
      return NextResponse.json({ error: 'No outputs found' }, { status: 404 });
    }

    // Generate PDFs for each report
    const reportsWithPdfs = await Promise.all(
      outputs.map(async (output) => {
        const meta = agentMeta[output.agent.name] || { emoji: '🤖', role: 'Agent', color: '#6366f1' };
        
        // Generate PDF
        let pdfUrl: string | undefined;
        try {
          const pdfResponse = await fetch(`${baseUrl}/api/reports/generate-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outputId: output.id }),
          });
          const pdfData = await pdfResponse.json();
          if (pdfData.success) {
            pdfUrl = pdfData.pdfUrl;
          }
        } catch (e) {
          console.error('Failed to generate PDF for', output.agent.name, e);
        }
        
        return {
          agentName: output.agent.name,
          agentRole: meta.role,
          agentEmoji: meta.emoji,
          agentColor: meta.color,
          taskName: output.task.taskName,
          content: output.content,
          summary: output.summary,
          createdAt: output.createdAt.toISOString(),
          shareUrl: `${baseUrl}/reports/${output.id}`,
          pdfUrl,
        };
      })
    );

    // Also generate combined PDF
    let combinedPdfUrl: string | undefined;
    try {
      const combinedResponse = await fetch(`${baseUrl}/api/reports/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'combined', outputIds }),
      });
      const combinedData = await combinedResponse.json();
      if (combinedData.success) {
        combinedPdfUrl = combinedData.pdfUrl;
      }
    } catch (e) {
      console.error('Failed to generate combined PDF', e);
    }

    // Generate email HTML
    const emailHtml = generateEmailHtml(reportsWithPdfs, baseUrl);

    // Extract app name for sender alias
    const appName = 'Mission Control';
    const senderEmail = `noreply@${new URL(baseUrl).hostname}`;

    // Send email
    const emailResponse = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_DAILY_RESEARCH_REPORTS,
        subject: `🎯 Mission Control Daily Briefing - ${format(new Date(), 'MMMM d, yyyy')}`,
        body: emailHtml,
        is_html: true,
        recipient_email: recipientEmail,
        sender_email: senderEmail,
        sender_alias: appName,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResult.success) {
      if (emailResult.notification_disabled) {
        return NextResponse.json({ 
          success: true, 
          message: 'Notification disabled by user',
          pdfUrls: reportsWithPdfs.map(r => r.pdfUrl).filter(Boolean),
          combinedPdfUrl,
        });
      }
      throw new Error(emailResult.message || 'Failed to send email');
    }

    return NextResponse.json({
      success: true,
      message: `Email sent to ${recipientEmail}`,
      reportsCount: reportsWithPdfs.length,
      pdfUrls: reportsWithPdfs.map(r => ({ agent: r.agentName, url: r.pdfUrl })),
      combinedPdfUrl,
      shareUrls: reportsWithPdfs.map(r => ({ agent: r.agentName, url: r.shareUrl })),
    });
  } catch (error) {
    console.error('Error sending email:', error);
    // Return generic error to avoid leaking internal details
    return NextResponse.json(
      { error: 'Failed to send email. Please try again later.' },
      { status: 500 }
    );
  }
}
