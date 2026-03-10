import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const VALID_FEEDS = ['all', 'rose', 'cathy', 'ruthie', 'sarah', 'war-room'] as const;
type FeedType = typeof VALID_FEEDS[number];

const agentMeta: Record<string, { emoji: string; role: string; color: string }> = {
  'Rose': { emoji: '🌹', role: 'Supervisor & Executive Compiler', color: '#ec4899' },
  'Cathy': { emoji: '🔬', role: 'AI Research Specialist', color: '#8b5cf6' },
  'Ruthie': { emoji: '💊', role: 'Medical Research Specialist', color: '#10b981' },
  'Sarah': { emoji: '🔐', role: 'Cybersecurity Intelligence Specialist', color: '#ef4444' },
};

const feedMeta: Record<FeedType, { title: string; description: string; category?: string }> = {
  'all': {
    title: 'Mission Control - All Intelligence Reports',
    description: 'Daily intelligence briefings from all Mission Control agents covering AI, Medical, and Cybersecurity research.',
  },
  'rose': {
    title: 'Mission Control - Rose\'s Executive Briefings',
    description: 'Executive summaries and compiled intelligence reports from Rose, the Mission Control Supervisor.',
    category: 'Executive Briefings',
  },
  'cathy': {
    title: 'Mission Control - AI Research Reports',
    description: 'AI and technology research intelligence from Cathy, the AI Research Specialist.',
    category: 'AI Research',
  },
  'ruthie': {
    title: 'Mission Control - Medical Research Reports',
    description: 'Medical and healthcare research intelligence from Ruthie, the Medical Research Specialist.',
    category: 'Medical Research',
  },
  'sarah': {
    title: 'Mission Control - Cybersecurity Intelligence',
    description: 'Cybersecurity threat intelligence and CVE analysis from Sarah, the Cybersecurity Intelligence Specialist.',
    category: 'Cybersecurity',
  },
  'war-room': {
    title: '🔐 War Room - Tactical Cyber Intelligence',
    description: 'Real-time cybersecurity threat intelligence, CVE alerts, zero-day tracking, and tactical briefings from the Mission Control War Room.',
    category: 'Cybersecurity War Room',
  },
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripMarkdown(content: string): string {
  return content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^[-*]\s/gm, '• ')
    .replace(/\|[^|\n]+\|/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function generateAtomFeed(
  feedType: FeedType,
  outputs: Array<{
    id: string;
    content: string;
    summary: string | null;
    createdAt: Date;
    agent: { name: string };
    task: { taskName: string };
  }>,
  baseUrl: string
): string {
  const meta = feedMeta[feedType];
  const updated = outputs.length > 0 ? outputs[0].createdAt.toISOString() : new Date().toISOString();
  const feedUrl = `${baseUrl}/api/feeds/${feedType}.xml`;
  
  // War Room specific styling
  const isWarRoom = feedType === 'war-room';
  const logoEmoji = isWarRoom ? '🔐' : '🎯';
  const subtitle = isWarRoom 
    ? 'Tactical Threat Intelligence • CVE Tracking • Zero-Day Alerts'
    : 'Multi-Agent Intelligence Orchestration';
  
  const entries = outputs.map(output => {
    const agentInfo = agentMeta[output.agent.name] || { emoji: '🤖', role: 'Agent', color: '#6366f1' };
    const reportUrl = `${baseUrl}/reports/${output.id}`;
    const plainContent = stripMarkdown(output.content);
    const contentPreview = plainContent.substring(0, 500) + (plainContent.length > 500 ? '...' : '');
    
    // Social share links
    const shareTitle = encodeURIComponent(`${agentInfo.emoji} ${output.task.taskName} by ${output.agent.name}`);
    const shareUrl = encodeURIComponent(reportUrl);
    
    const socialLinks = `
      <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #333;">
        <strong>Share this report:</strong><br/>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" style="color: #1877F2;">📘 Facebook</a> |
        <a href="https://twitter.com/intent/tweet?text=${shareTitle}&amp;url=${shareUrl}" style="color: #1DA1F2;">🐦 X/Twitter</a> |
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" style="color: #0A66C2;">💼 LinkedIn</a>
      </p>
    `;
    
    return `
    <entry>
      <id>${reportUrl}</id>
      <title>${escapeXml(agentInfo.emoji + ' ' + output.task.taskName + ' - ' + output.agent.name)}</title>
      <link href="${reportUrl}" rel="alternate" type="text/html"/>
      <updated>${output.createdAt.toISOString()}</updated>
      <published>${output.createdAt.toISOString()}</published>
      <author>
        <name>${escapeXml(output.agent.name + ' (' + agentInfo.role + ')')}</name>
      </author>
      ${meta.category ? `<category term="${escapeXml(meta.category)}"/>` : ''}
      <summary type="text">${escapeXml(output.summary || contentPreview.substring(0, 200))}</summary>
      <content type="html"><![CDATA[
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e0e0e0; background: #1a1a2e; padding: 20px; border-radius: 12px;">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <span style="font-size: 48px; margin-right: 16px;">${agentInfo.emoji}</span>
            <div>
              <h2 style="margin: 0; color: ${agentInfo.color};">${escapeXml(output.agent.name)}</h2>
              <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 14px;">${escapeXml(agentInfo.role)}</p>
            </div>
          </div>
          ${output.summary ? `
          <div style="background: #2d2d4a; padding: 16px; border-radius: 8px; border-left: 4px solid ${agentInfo.color}; margin-bottom: 20px;">
            <strong style="color: ${agentInfo.color};">Executive Summary:</strong>
            <p style="margin: 8px 0 0 0; color: #cbd5e1;">${escapeXml(output.summary)}</p>
          </div>
          ` : ''}
          <div style="color: #e0e0e0; line-height: 1.6;">
            ${escapeXml(contentPreview)}
          </div>
          <p style="margin-top: 20px;">
            <a href="${reportUrl}" style="color: #818cf8; text-decoration: none;">📄 Read Full Report →</a>
          </p>
          ${socialLinks}
        </div>
      ]]></content>
    </entry>`;
  }).join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${feedUrl}</id>
  <title>${escapeXml(meta.title)}</title>
  <subtitle>${escapeXml(subtitle)}</subtitle>
  <link href="${feedUrl}" rel="self" type="application/atom+xml"/>
  <link href="${baseUrl}${isWarRoom ? '/war-room' : ''}" rel="alternate" type="text/html"/>
  <updated>${updated}</updated>
  <icon>${baseUrl}/favicon.ico</icon>
  <logo>${baseUrl}/logo.png</logo>
  <rights>© ${new Date().getFullYear()} Mission Control. All rights reserved.</rights>
  <generator uri="https://rose.abacusai.app" version="1.0">Mission Control ${logoEmoji}</generator>
  ${entries}
</feed>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feed: string }> }
) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "feeds", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const { feed } = await params;
    
    // Strip .xml extension if present
    const feedType = feed.replace(/\.xml$/, '') as FeedType;
    
    if (!VALID_FEEDS.includes(feedType)) {
      return NextResponse.json(
        { error: `Invalid feed type. Valid feeds: ${VALID_FEEDS.join(', ')}` },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://rose.abacusai.app';
    
    // Build where clause based on feed type
    let whereClause: Record<string, unknown> = {};
    
    if (feedType === 'all') {
      // No filter - get all outputs
    } else if (feedType === 'war-room' || feedType === 'sarah') {
      // War Room and Sarah both get Sarah's outputs
      whereClause = { agent: { name: 'Sarah' } };
    } else {
      // Filter by agent name (capitalize first letter)
      const agentName = feedType.charAt(0).toUpperCase() + feedType.slice(1);
      whereClause = { agent: { name: agentName } };
    }

    const outputs = await prisma.output.findMany({
      where: whereClause,
      include: {
        agent: { select: { name: true } },
        task: { select: { taskName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 entries
    });

    const atomFeed = generateAtomFeed(feedType, outputs, baseUrl);

    return new NextResponse(atomFeed, {
      status: 200,
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Feed generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate feed' },
      { status: 500 }
    );
  }
}
