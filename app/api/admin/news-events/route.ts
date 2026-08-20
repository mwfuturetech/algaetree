import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

type MediaType = "image" | "video";

interface NewsEventPayload {
    category?: string;
    title?: string;
    excerpt?: string;
    mediaType?: MediaType;
    mediaUrl?: string;
    mediaPath?: string;
    link?: string;
    createdAt?: number;
}

function isValidPayload(payload: NewsEventPayload) {
    // Relaxed — allow saving partially-filled items (e.g. drafts).
    return typeof payload === "object" && payload !== null;
}

function isBlobUrl(value?: string | null) {
    if (!value) return false;
    if (!value.startsWith("https://")) return false;
    return value.includes(".blob.vercel-storage.com");
}

function deriveBlobUrl(mediaPath?: string | null, mediaUrl?: string) {
    if (isBlobUrl(mediaPath)) return mediaPath as string;
    if (isBlobUrl(mediaUrl)) return mediaUrl as string;
    return null;
}

async function deleteMediaFile(mediaPath?: string | null, mediaUrl?: string) {
    const blobUrl = deriveBlobUrl(mediaPath, mediaUrl);
    if (!blobUrl) return;

    try {
        await del(blobUrl);
    } catch {
        // Ignore blob deletion failures so record updates/deletes don't fail for stale media URLs.
    }
}

async function getNewsEvent(newsEventId: string) {
    if (!DB_URL) {
        throw new Error("Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL");
    }

    const response = await fetch(`${DB_URL}/newsEvents/${newsEventId}.json`);
    if (!response.ok) {
        throw new Error("Failed to load news item");
    }

    return (await response.json()) as NewsEventPayload | null;
}

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as NewsEventPayload;

        if (!isValidPayload(payload)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!DB_URL) {
            return NextResponse.json({ error: "Firebase database is not configured" }, { status: 500 });
        }

        const response = await fetch(`${DB_URL}/newsEvents.json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to create news item" }, { status: 500 });
        }

        const result = await response.json();
        return NextResponse.json({ success: true, newsEventId: result.name });
    } catch {
        return NextResponse.json({ error: "Failed to create news item" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { newsEventId, payload } = (await request.json()) as {
            newsEventId?: string;
            payload?: NewsEventPayload;
        };

        if (!newsEventId || !payload || !isValidPayload(payload)) {
            return NextResponse.json({ error: "newsEventId and valid payload are required" }, { status: 400 });
        }

        if (!DB_URL) {
            return NextResponse.json({ error: "Firebase database is not configured" }, { status: 500 });
        }

        const existing = await getNewsEvent(newsEventId);

        const response = await fetch(`${DB_URL}/newsEvents/${newsEventId}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to update news item" }, { status: 500 });
        }

        const previousPath = deriveBlobUrl(existing?.mediaPath, existing?.mediaUrl);
        const nextPath = deriveBlobUrl(payload.mediaPath, payload.mediaUrl);

        if (previousPath && previousPath !== nextPath) {
            await deleteMediaFile(previousPath, existing?.mediaUrl);
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to update news item" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const newsEventId = searchParams.get("newsEventId");

        if (!newsEventId) {
            return NextResponse.json({ error: "newsEventId is required" }, { status: 400 });
        }

        if (!DB_URL) {
            return NextResponse.json({ error: "Firebase database is not configured" }, { status: 500 });
        }

        const existing = await getNewsEvent(newsEventId);

        const response = await fetch(`${DB_URL}/newsEvents/${newsEventId}.json`, {
            method: "DELETE",
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to delete news item" }, { status: 500 });
        }

        await deleteMediaFile(existing?.mediaPath, existing?.mediaUrl);

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete news item" }, { status: 500 });
    }
}