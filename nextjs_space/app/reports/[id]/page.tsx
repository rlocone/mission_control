import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import ShareableReportContent from './_components/shareable-report-content';

const agentMeta: Record<string, { emoji: string; role: string; color: string }> = {
  'Rose': { emoji: '🌹', role: 'Supervisor & Executive Compiler', color: '#ec4899' },
  'Cathy': { emoji: '🔬', role: 'AI Research Specialist', color: '#8b5cf6' },
  'Ruthie': { emoji: '💊', role: 'Medical Research Specialist', color: '#10b981' },
  'Sarah': { emoji: '🔐', role: 'Cybersecurity Intelligence Specialist', color: '#ef4444' },
};

/**
 * Validate ID format to prevent injection attacks
 * Accepts standard UUIDs and prefixed UUIDs
 */
function isValidId(id: string): boolean {
  if (!id || id.length > 100) return false;
  // Standard UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Prefixed UUID (e.g., "output-uuid")
  const prefixedRegex = /^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Simple alphanumeric ID
  const simpleIdRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,98}$/;
  
  return uuidRegex.test(id) || prefixedRegex.test(id) || simpleIdRegex.test(id);
}

async function getOutput(id: string) {
  // Validate ID format before querying
  if (!isValidId(id)) {
    return null;
  }
  
  try {
    const output = await prisma.output.findUnique({
      where: { id },
      include: {
        agent: { select: { name: true } },
        task: { select: { taskName: true } },
      },
    });
    return output;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const output = await getOutput(id);
  
  if (!output) {
    return {
      title: 'Report Not Found | Mission Control',
    };
  }

  const meta = agentMeta[output.agent.name] || { emoji: '🤖', role: 'Agent', color: '#6366f1' };
  const title = `${meta.emoji} ${output.task.taskName} | ${output.agent.name}`;
  const description = output.summary || `${output.agent.name}'s ${output.task.taskName} - Intelligence Report from Mission Control`;
  
  // Create a dynamic OG image URL
  const ogImageUrl = `${process.env.NEXTAUTH_URL || ''}/api/og/report?id=${id}&agent=${encodeURIComponent(output.agent.name)}&task=${encodeURIComponent(output.task.taskName)}`;

  return {
    title,
    description: description.substring(0, 200),
    openGraph: {
      title,
      description: description.substring(0, 200),
      type: 'article',
      siteName: 'Mission Control',
      images: [{
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `${output.agent.name} - ${output.task.taskName}`,
      }],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.substring(0, 200),
      images: [ogImageUrl],
      creator: '@MissionControl',
    },
    other: {
      'linkedin:title': title,
      'linkedin:description': description.substring(0, 200),
    },
  };
}

export default async function ShareableReportPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const output = await getOutput(id);

  if (!output) {
    notFound();
  }

  const meta = agentMeta[output.agent.name] || { emoji: '🤖', role: 'Agent', color: '#6366f1' };

  return (
    <ShareableReportContent
      output={{
        id: output.id,
        agentName: output.agent.name,
        agentEmoji: meta.emoji,
        agentRole: meta.role,
        agentColor: meta.color,
        taskName: output.task.taskName,
        content: output.content,
        summary: output.summary,
        createdAt: output.createdAt.toISOString(),
      }}
    />
  );
}
