export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidUUID, isValidLogLevel, isValidDateString, sanitizeString, MAX_EXPORT_LIMIT } from "@/lib/validation";
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting for export operations
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "logs:export", RATE_LIMITS.export);
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

    // Limit export to prevent memory issues
    const logs = await prisma.log.findMany({
      where,
      include: {
        agent: true,
        task: true,
      },
      orderBy: { timestamp: "desc" },
      take: MAX_EXPORT_LIMIT,
    });

    const csvRows = [
      ["Timestamp", "Agent", "Log Level", "Message", "Task"].join(","),
      ...(logs ?? []).map((log) =>
        [
          log?.timestamp?.toISOString() ?? "",
          log?.agent?.name ?? "",
          log?.logLevel ?? "",
          `"${(log?.message ?? "").replace(/"/g, '""')}"`,
          log?.task?.taskName ?? "",
        ].join(",")
      ),
    ];

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="logs-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting logs:", error);
    return NextResponse.json(
      { error: "Failed to export logs" },
      { status: 500 }
    );
  }
}
