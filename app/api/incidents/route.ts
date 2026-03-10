import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  parseIntBounded,
  isValidUUID,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  validationError,
} from "@/lib/validation";
import {
  checkRateLimit,
  getClientId,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "incidents:get", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseIntBounded(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const agentId = searchParams.get("agentId");
    const resolved = searchParams.get("resolved");

    // Validate agentId if provided
    if (agentId && !isValidUUID(agentId)) {
      return validationError("Invalid agentId format");
    }

    const where: Record<string, unknown> = {};
    if (agentId) where.triggeringAgentId = agentId;
    if (resolved === "true") where.resolvedAt = { not: null };
    if (resolved === "false") where.resolvedAt = null;

    const incidents = await prisma.thresholdIncident.findMany({
      where,
      include: {
        triggeringAgent: {
          select: {
            id: true,
            name: true,
            role: true,
            appId: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting for write operations
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "incidents:post", RATE_LIMITS.write);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.incidentType || !body.triggeringAgentId || !body.thresholdName) {
      return validationError("Missing required fields: incidentType, triggeringAgentId, thresholdName");
    }

    if (!isValidUUID(body.triggeringAgentId)) {
      return validationError("Invalid triggeringAgentId format");
    }

    // Validate numeric fields
    if (typeof body.thresholdLimit !== 'number' || typeof body.actualValue !== 'number') {
      return validationError("thresholdLimit and actualValue must be numbers");
    }

    const incident = await prisma.thresholdIncident.create({
      data: {
        incidentType: body.incidentType,
        triggeringAgentId: body.triggeringAgentId,
        triggeringTaskId: body.triggeringTaskId || null,
        triggeringTaskName: body.triggeringTaskName ? String(body.triggeringTaskName).slice(0, 255) : null,
        thresholdName: String(body.thresholdName).slice(0, 100),
        thresholdLimit: body.thresholdLimit,
        actualValue: Math.round(body.actualValue),
        tokensAtIncident: body.tokensAtIncident,
        dailyUsageAtTime: body.dailyUsageAtTime,
        burnRateAtTime: body.burnRateAtTime,
        stopReason: body.stopReason ? String(body.stopReason).slice(0, 1000) : '',
        workflowHalted: body.workflowHalted ?? true,
        agentsAffected: Array.isArray(body.agentsAffected) ? body.agentsAffected.slice(0, 20) : [],
        tasksSkipped: Array.isArray(body.tasksSkipped) ? body.tasksSkipped.slice(0, 20) : [],
        thresholds: body.thresholds || {},
      },
      include: {
        triggeringAgent: true,
      },
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  // Rate limiting for write operations
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "incidents:patch", RATE_LIMITS.write);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const body = await request.json();
    const { id, resolution } = body;

    if (!id || !isValidUUID(id)) {
      return validationError("Valid incident ID required");
    }

    if (!resolution || typeof resolution !== 'string') {
      return validationError("Resolution message required");
    }

    const incident = await prisma.thresholdIncident.update({
      where: { id },
      data: {
        resolution: resolution.slice(0, 2000),
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Error updating incident:", error);
    return NextResponse.json(
      { error: "Failed to update incident" },
      { status: 500 }
    );
  }
}
