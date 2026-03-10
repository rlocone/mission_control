import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateReportPdfHtml, generateCombinedReportHtml } from '@/lib/pdf-templates';
import { uploadBuffer } from '@/lib/s3';
import { isValidUUID, isValidUUIDArray, validationError } from '@/lib/validation';
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const agentMeta: Record<string, { emoji: string; role: string }> = {
  'Rose': { emoji: '🌹', role: 'Supervisor & Executive Compiler' },
  'Cathy': { emoji: '🔬', role: 'AI Research Specialist' },
  'Ruthie': { emoji: '💊', role: 'Medical Research Specialist' },
  'Sarah': { emoji: '🔐', role: 'Cybersecurity Intelligence Specialist' },
};

async function generatePdf(htmlContent: string): Promise<Buffer> {
  // Step 1: Create the PDF generation request
  const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deployment_token: process.env.ABACUSAI_API_KEY,
      html_content: htmlContent,
      pdf_options: {
        format: 'A4',
        print_background: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      },
      base_url: process.env.NEXTAUTH_URL || '',
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json().catch(() => ({ error: 'Failed to create PDF request' }));
    throw new Error(error.error || 'Failed to create PDF request');
  }

  const { request_id } = await createResponse.json();
  if (!request_id) {
    throw new Error('No request ID returned');
  }

  // Step 2: Poll for status until completion
  const maxAttempts = 120;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
    });

    const statusResult = await statusResponse.json();
    const status = statusResult?.status || 'FAILED';
    const result = statusResult?.result || null;

    if (status === 'SUCCESS') {
      if (result && result.result) {
        return Buffer.from(result.result, 'base64');
      } else {
        throw new Error('PDF generation completed but no result data');
      }
    } else if (status === 'FAILED') {
      throw new Error(result?.error || 'PDF generation failed');
    }

    attempts++;
  }

  throw new Error('PDF generation timed out');
}

export async function POST(request: NextRequest) {
  // Rate limiting for expensive operations
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "reports:pdf", RATE_LIMITS.expensive);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const { outputId, type = 'single', outputIds } = await request.json();

    // Validate inputs
    if (type === 'combined') {
      if (!isValidUUIDArray(outputIds)) {
        return validationError("Invalid outputIds: must be an array of valid UUIDs (max 50)");
      }
    } else if (outputId) {
      if (!isValidUUID(outputId)) {
        return validationError("Invalid outputId format");
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://rose.abacusai.app';
    
    let reports: Array<{
      agentName: string;
      agentRole: string;
      agentEmoji: string;
      taskName: string;
      content: string;
      summary: string;
      createdAt: string;
      shareUrl?: string;
    }> = [];

    if (type === 'combined' && outputIds && outputIds.length > 0) {
      // Generate combined PDF for multiple reports
      const outputs = await prisma.output.findMany({
        where: { id: { in: outputIds } },
        include: {
          agent: { select: { name: true } },
          task: { select: { taskName: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      reports = outputs.map(output => {
        const meta = agentMeta[output.agent.name] || { emoji: '🤖', role: 'Agent' };
        return {
          agentName: output.agent.name,
          agentRole: meta.role,
          agentEmoji: meta.emoji,
          taskName: output.task.taskName,
          content: output.content,
          summary: output.summary || '',
          createdAt: output.createdAt.toISOString(),
          shareUrl: `${baseUrl}/reports/${output.id}`,
        };
      });
    } else if (outputId) {
      // Generate single PDF
      const output = await prisma.output.findUnique({
        where: { id: outputId },
        include: {
          agent: { select: { name: true } },
          task: { select: { taskName: true } },
        },
      });

      if (!output) {
        return NextResponse.json({ error: 'Output not found' }, { status: 404 });
      }

      const meta = agentMeta[output.agent.name] || { emoji: '🤖', role: 'Agent' };
      reports = [{
        agentName: output.agent.name,
        agentRole: meta.role,
        agentEmoji: meta.emoji,
        taskName: output.task.taskName,
        content: output.content,
        summary: output.summary || '',
        createdAt: output.createdAt.toISOString(),
        shareUrl: `${baseUrl}/reports/${output.id}`,
      }];
    } else {
      return NextResponse.json({ error: 'outputId or outputIds required' }, { status: 400 });
    }

    // Generate HTML
    const htmlContent = type === 'combined' 
      ? generateCombinedReportHtml(reports)
      : generateReportPdfHtml(reports[0]);

    // Generate PDF
    const pdfBuffer = await generatePdf(htmlContent);

    // Upload to S3
    const fileName = type === 'combined'
      ? `mission-control-briefing-${new Date().toISOString().split('T')[0]}.pdf`
      : `${reports[0].agentName.toLowerCase()}-report-${new Date().toISOString().split('T')[0]}.pdf`;

    const cloudStoragePath = await uploadBuffer(pdfBuffer, fileName, 'application/pdf', true);

    // Get the public URL
    const { bucketName } = { bucketName: process.env.AWS_BUCKET_NAME || '' };
    const region = process.env.AWS_REGION || 'us-east-1';
    const pdfUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${cloudStoragePath}`;

    return NextResponse.json({
      success: true,
      pdfUrl,
      fileName,
      cloudStoragePath,
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Return generic error to avoid leaking internal details
    return NextResponse.json(
      { error: 'Failed to generate PDF. Please try again later.' },
      { status: 500 }
    );
  }
}
