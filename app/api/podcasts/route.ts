import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIntBounded } from "@/lib/validation";
import { checkRateLimit, getClientId, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "podcasts:get", RATE_LIMITS.standard);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseIntBounded(searchParams.get("limit"), 5, 1, 10);

    const episodes = await prisma.podcastEpisode.findMany({
      orderBy: { episodeNumber: "desc" },
      take: limit,
    });

    return NextResponse.json(episodes);
  } catch (error) {
    console.error("Error fetching podcast episodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch podcast episodes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting for write operations
  const clientId = getClientId(request);
  const rateCheck = checkRateLimit(clientId, "podcasts:post", RATE_LIMITS.write);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn);
  }

  try {
    const body = await request.json();
    const {
      episodeNumber,
      title,
      airDate,
      audioUrl,
      showNotesUrl,
      showNotesPdfUrl,
      summary,
      twitVerified,
      grcVerified,
    } = body;

    // Validation
    if (!episodeNumber || typeof episodeNumber !== "number") {
      return NextResponse.json(
        { error: "Episode number is required and must be a number" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!airDate) {
      return NextResponse.json(
        { error: "Air date is required" },
        { status: 400 }
      );
    }

    // Upsert episode (update if exists, create if not)
    const episode = await prisma.podcastEpisode.upsert({
      where: { episodeNumber },
      update: {
        title: title.slice(0, 500),
        airDate: new Date(airDate),
        audioUrl: audioUrl?.slice(0, 1000) || null,
        showNotesUrl: showNotesUrl?.slice(0, 1000) || null,
        showNotesPdfUrl: showNotesPdfUrl?.slice(0, 1000) || null,
        summary: summary?.slice(0, 10000) || null,
        twitVerified: Boolean(twitVerified),
        grcVerified: Boolean(grcVerified),
        processedAt: new Date(),
      },
      create: {
        episodeNumber,
        title: title.slice(0, 500),
        airDate: new Date(airDate),
        audioUrl: audioUrl?.slice(0, 1000) || null,
        showNotesUrl: showNotesUrl?.slice(0, 1000) || null,
        showNotesPdfUrl: showNotesPdfUrl?.slice(0, 1000) || null,
        summary: summary?.slice(0, 10000) || null,
        twitVerified: Boolean(twitVerified),
        grcVerified: Boolean(grcVerified),
      },
    });

    return NextResponse.json(episode, { status: 201 });
  } catch (error) {
    console.error("Error saving podcast episode:", error);
    return NextResponse.json(
      { error: "Failed to save podcast episode" },
      { status: 500 }
    );
  }
}
