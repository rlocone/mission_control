export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  parseIntBounded, 
  isValidUUID, 
  isValidLogLevel, 
  isValidDateString, 
  sanitizeString,
  MAX_LIMIT, 
  DEFAULT_LIMIT 
} from "@/lib/validation";
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

// Allowed sort fields to prevent SQL injection via sort field
const ALLOWED_SORT_FIELDS = ['timestamp', 'logLevel', 'createdAt'];

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "logs:get", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const searchParams = request?.nextUrl?.searchParams;
    const search = sanitizeString(searchParams?.get("search"), 200);
    const agentId = searchParams?.get("agentId");
    const logLevel = searchParams?.get("logLevel");
    const startDate = searchParams?.get("startDate");
    const endDate = searchParams?.get("endDate");
    const page = parseIntBounded(searchParams?.get("page"), 1, 1, 1000);
    const limit = parseIntBounded(searchParams?.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const sortField = searchParams?.get("sortField") ?? "timestamp";
    const sortOrder = searchParams?.get("sortOrder") === "asc" ? "asc" : "desc";

    // Validate inputs
    if (agentId && !isValidUUID(agentId)) {
      return NextResponse.json({ error: "Invalid agentId format" }, { status: 400 });
    }
    if (logLevel && !isValidLogLevel(logLevel)) {
      return NextResponse.json({ error: "Invalid logLevel" }, { status: 400 });
    }
    if (startDate && !isValidDateString(startDate)) {
      return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
    }
    if (endDate && !isValidDateString(endDate)) {
      return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
    }
    
    // Validate sort field against whitelist
    const safeSortField = ALLOWED_SORT_FIELDS.includes(sortField) ? sortField : "timestamp";

    const where: Record<string, unknown> = {};

    if (search) {
      where.message = { contains: search, mode: "insensitive" };
    }
    if (agentId) where.agentId = agentId;
    if (logLevel) where.logLevel = logLevel.toUpperCase();
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) (where.timestamp as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.timestamp as Record<string, Date>).lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        include: {
          agent: true,
          task: true,
        },
        orderBy: { [safeSortField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.log.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs ?? [],
      total: total ?? 0,
      page,
      totalPages: Math.ceil((total ?? 0) / limit),
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
