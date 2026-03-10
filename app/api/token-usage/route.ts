export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidUUID } from "@/lib/validation";
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

// Valid period values
const VALID_PERIODS = ['daily', 'weekly', 'monthly'];

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "token-usage:get", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const searchParams = request?.nextUrl?.searchParams;
    const period = searchParams?.get("period") ?? "daily";
    const agentId = searchParams?.get("agentId");

    // Validate inputs
    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json({ error: "Invalid period. Use: daily, weekly, or monthly" }, { status: 400 });
    }
    if (agentId && !isValidUUID(agentId)) {
      return NextResponse.json({ error: "Invalid agentId format" }, { status: 400 });
    }

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "weekly":
        startDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const where: Record<string, unknown> = {
      timestamp: { gte: startDate },
    };
    if (agentId) where.agentId = agentId;

    const tokenUsage = await prisma.tokenUsage.findMany({
      where,
      include: { agent: true },
      orderBy: { timestamp: "asc" },
    });

    // Group by date and agent
    const grouped = (tokenUsage ?? []).reduce((acc: Record<string, Record<string, number>>, record) => {
      const date = record?.timestamp?.toISOString()?.split("T")?.[0] ?? "";
      if (!acc[date]) acc[date] = {};
      const agentName = record?.agent?.name ?? "Unknown";
      if (!acc[date][agentName]) acc[date][agentName] = 0;
      acc[date][agentName] += record?.tokensUsed ?? 0;
      return acc;
    }, {});

    const chartData = Object.entries(grouped ?? {}).map(([date, agents]) => ({
      date,
      ...(agents ?? {}),
    }));

    // Get totals per agent FOR THE SELECTED PERIOD (not all-time)
    const totals = await prisma.tokenUsage.groupBy({
      by: ["agentId"],
      where: {
        timestamp: { gte: startDate },
      },
      _sum: { tokensUsed: true, cost: true },
    });

    const agents = await prisma.agent.findMany();
    
    // Cost per token (matches seed.ts simulation rate: $0.00002/token = $0.02/1K)
    const COST_PER_TOKEN = 0.00002;
    
    const totalsByAgent = (totals ?? []).map((t) => {
      const agent = agents?.find((a) => a?.id === t?.agentId);
      const tokens = t?._sum?.tokensUsed ?? 0;
      // Use stored cost, or calculate if missing/zero
      let cost = t?._sum?.cost ?? 0;
      if (cost === 0 && tokens > 0) {
        cost = tokens * COST_PER_TOKEN;
      }
      return {
        agentId: t?.agentId ?? "",
        agentName: agent?.name ?? "Unknown",
        totalTokens: tokens,
        totalCost: cost,
      };
    });

    return NextResponse.json({
      chartData: chartData ?? [],
      totalsByAgent: totalsByAgent ?? [],
    });
  } catch (error) {
    console.error("Error fetching token usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch token usage" },
      { status: 500 }
    );
  }
}
