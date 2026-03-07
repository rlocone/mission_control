export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "agents:get", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const agents = await prisma.agent.findMany({
      include: {
        _count: {
          select: {
            tasks: { where: { status: "COMPLETED" } },
          },
        },
        tasks: {
          orderBy: { assignedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const agentsWithStats = agents.map((agent) => ({
      ...agent,
      completedTasks: agent?._count?.tasks ?? 0,
    }));

    return NextResponse.json(agentsWithStats);
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
