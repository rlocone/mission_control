export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIntBounded, isValidUUID, MAX_LIMIT, DEFAULT_LIMIT } from "@/lib/validation";
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "outputs:get", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const searchParams = request?.nextUrl?.searchParams;
    const limit = parseIntBounded(searchParams?.get("limit"), 10, 1, MAX_LIMIT);
    const agentId = searchParams?.get("agentId");

    // Validate agentId if provided
    if (agentId && !isValidUUID(agentId)) {
      return NextResponse.json({ error: "Invalid agentId format" }, { status: 400 });
    }

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;

    const outputs = await prisma.output.findMany({
      where,
      include: {
        agent: true,
        task: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(outputs ?? []);
  } catch (error) {
    console.error("Error fetching outputs:", error);
    return NextResponse.json(
      { error: "Failed to fetch outputs" },
      { status: 500 }
    );
  }
}
