export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIntBounded, isValidUUID, isValidTaskStatus, MAX_LIMIT, DEFAULT_LIMIT } from "@/lib/validation";
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "tasks:get", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const searchParams = request?.nextUrl?.searchParams;
    const agentId = searchParams?.get("agentId");
    const status = searchParams?.get("status");
    const limit = parseIntBounded(searchParams?.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);

    // Validate inputs
    if (agentId && !isValidUUID(agentId)) {
      return NextResponse.json({ error: "Invalid agentId format" }, { status: 400 });
    }
    if (status && !isValidTaskStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (status) where.status = status.toUpperCase();

    const tasks = await prisma.task.findMany({
      where,
      include: {
        agent: true,
        outputs: true,
      },
      orderBy: { assignedAt: "desc" },
      take: limit,
    });

    return NextResponse.json(tasks ?? []);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
