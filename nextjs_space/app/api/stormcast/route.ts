import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIntBounded, MAX_LIMIT, DEFAULT_LIMIT } from "@/lib/validation";
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "stormcast", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = parseIntBounded(limitParam, DEFAULT_LIMIT, 1, MAX_LIMIT);

    const episodes = await prisma.sansStormcast.findMany({
      orderBy: { episodeDate: "desc" },
      take: limit,
    });

    return NextResponse.json(episodes);
  } catch (error) {
    console.error("Error fetching SANS Stormcast episodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch episodes" },
      { status: 500 }
    );
  }
}
