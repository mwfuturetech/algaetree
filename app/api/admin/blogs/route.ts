import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { BlogContentSection, BlogRecord } from "@/app/components/sections/blog/types";

export const runtime = "nodejs";

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

function parseId(value: string | null | undefined): number | null {
    if (!value) return null;
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

function normalizeSections(sections?: BlogContentSection[]): BlogContentSection[] {
    return (sections ?? [])
        .map<BlogContentSection>((section) => ({
            heading: String(section.heading ?? "").trim(),
            subHeading: String(section.subHeading ?? "").trim(),
            paragraph: String(section.paragraph ?? "").trim(),
            highlightHeading: String(section.highlightHeading ?? "").trim(),
            highlightSubHeading: String(section.highlightSubHeading ?? "").trim(),
            highlightParagraph: String(section.highlightParagraph ?? "").trim(),
            mediaType: section.mediaType === "video" ? "video" : "image",
            mediaUrl: String(section.mediaUrl ?? "").trim(),
            mediaPath: String(section.mediaPath ?? "").trim(),
        }))
        .filter((section) => section.heading || section.subHeading || section.paragraph || section.highlightHeading || section.highlightSubHeading || section.highlightParagraph || section.mediaUrl);
}

function stripHtml(value: string) {
    return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function parseLegacyContent(content?: string): BlogContentSection[] {
    const lines = (content ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const sections: BlogContentSection[] = [];
    let current: BlogContentSection = {
        heading: "",
        subHeading: "",
        paragraph: "",
        highlightHeading: "",
        highlightSubHeading: "",
        highlightParagraph: "",
        mediaType: "image",
        mediaUrl: "",
        mediaPath: "",
    };

    for (const line of lines) {
        if (line.startsWith("H1:")) {
            if (current.heading || current.subHeading || current.paragraph) {
                sections.push(current);
                current = { heading: "", subHeading: "", paragraph: "", highlightHeading: "", highlightSubHeading: "", highlightParagraph: "", mediaType: "image", mediaUrl: "", mediaPath: "" };
            }
            current.heading = line.replace("H1:", "").trim();
            continue;
        }

        if (line.startsWith("H2:")) {
            current.subHeading = line.replace("H2:", "").trim();
            continue;
        }

        if (line.startsWith("H3:")) {
            if (!current.subHeading) {
                current.subHeading = line.replace("H3:", "").trim();
            }
            continue;
        }

        if (line.startsWith("H4:")) {
            current.highlightHeading = line.replace("H4:", "").trim();
            continue;
        }

        if (line.startsWith("H5:")) {
            current.highlightSubHeading = line.replace("H5:", "").trim();
            continue;
        }

        if (line.startsWith("H6:")) {
            current.highlightParagraph = line.replace("H6:", "").trim();
            continue;
        }

        if (line.startsWith("M1:")) {
            current.mediaType = line.replace("M1:", "").trim() === "video" ? "video" : "image";
            continue;
        }

        if (line.startsWith("M2:")) {
            current.mediaUrl = line.replace("M2:", "").trim();
            continue;
        }

        current.paragraph = current.paragraph ? `${current.paragraph} ${line}` : line;
    }

    if (current.heading || current.subHeading || current.paragraph || current.highlightHeading || current.highlightSubHeading || current.highlightParagraph || current.mediaUrl) {
        sections.push(current);
    }

    return sections;
}

function sectionsToContent(sections: BlogContentSection[]) {
    return sections
        .map((section) => {
            const lines = [`H1: ${section.heading}`, `H2: ${section.subHeading}`, section.paragraph];

            if (section.highlightHeading || section.highlightSubHeading || section.highlightParagraph) {
                lines.push(`H4: ${section.highlightHeading}`, `H5: ${section.highlightSubHeading}`, `H6: ${section.highlightParagraph}`);
            }

            if (section.mediaUrl) {
                lines.push(`M1: ${section.mediaType === "video" ? "video" : "image"}`, `M2: ${section.mediaUrl}`);
            }

            return lines.join("\n");
        })
        .join("\n\n");
}

function normalizeInput(payload: Partial<BlogRecord>): BlogRecord {
    const legacyMediaType = payload.mediaType === "video" ? "video" : "image";
    const legacyMediaUrl = String(payload.mediaUrl ?? "").trim();
    const legacyMediaPath = String(payload.mediaPath ?? "").trim();

    const heroMediaUrl = String(payload.heroMediaUrl ?? legacyMediaUrl).trim();
    const contentSections = normalizeSections(payload.contentSections ?? parseLegacyContent(payload.content));

    return {
        title: String(payload.title ?? "").trim(),
        readMinutes: Number(payload.readMinutes ?? 0),
        status: payload.status === "draft" ? "draft" : "published",
        content: sectionsToContent(contentSections),
        contentSections,
        heroMediaType: payload.heroMediaType === "video" ? "video" : legacyMediaType,
        heroMediaUrl,
        heroMediaPath: String(payload.heroMediaPath ?? legacyMediaPath).trim(),
        pageMediaType: payload.pageMediaType === "video" ? "video" : legacyMediaType,
        pageMediaUrl: String(payload.pageMediaUrl ?? "").trim(),
        pageMediaPath: String(payload.pageMediaPath ?? "").trim(),
        mediaType: undefined,
        mediaUrl: undefined,
        mediaPath: undefined,
        createdAt: Number(payload.createdAt ?? Date.now()),
        updatedAt: Date.now(),
    };
}

function isValidPayload(payload: BlogRecord) {
    // Relaxed — allow saving drafts and partially-filled posts.
    // Only guard against a non-numeric/invalid read time.
    return typeof payload.readMinutes === "number" && payload.readMinutes >= 0;
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
        // Ignore blob deletion failures so blog updates/deletes don't fail for stale media URLs.
    }
}

async function fetchBlog(id: number) {
    if (!DB_URL) throw new Error("Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL");
    const response = await fetch(`${DB_URL}/blogs/${id}.json`);
    if (!response.ok) throw new Error("Failed to load blog");
    return (await response.json()) as BlogRecord | null;
}

export async function POST(request: Request) {
    try {
        if (!DB_URL) {
            return NextResponse.json({ error: "Firebase database is not configured" }, { status: 500 });
        }

        const input = normalizeInput((await request.json()) as Partial<BlogRecord>);
        if (!isValidPayload(input)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const listResponse = await fetch(`${DB_URL}/blogs.json`);
        if (!listResponse.ok) {
            return NextResponse.json({ error: "Failed to create blog" }, { status: 500 });
        }

        const existing = ((await listResponse.json()) as Record<string, BlogRecord> | null) ?? {};
        const numericIds = Object.keys(existing)
            .map((key) => Number(key))
            .filter((id) => Number.isInteger(id) && id > 0);
        const nextId = (numericIds.length ? Math.max(...numericIds) : 0) + 1;

        const response = await fetch(`${DB_URL}/blogs/${nextId}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...input, createdAt: Date.now(), updatedAt: Date.now() }),
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to create blog" }, { status: 500 });
        }

        return NextResponse.json({ success: true, blogId: nextId });
    } catch {
        return NextResponse.json({ error: "Failed to create blog" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        if (!DB_URL) {
            return NextResponse.json({ error: "Firebase database is not configured" }, { status: 500 });
        }

        const { blogId, payload } = (await request.json()) as {
            blogId?: number;
            payload?: Partial<BlogRecord>;
        };

        const id = Number(blogId);
        if (!Number.isInteger(id) || id <= 0 || !payload) {
            return NextResponse.json({ error: "blogId and payload are required" }, { status: 400 });
        }

        const input = normalizeInput(payload);
        if (!isValidPayload(input)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const existing = await fetchBlog(id);
        const response = await fetch(`${DB_URL}/blogs/${id}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...input, createdAt: existing?.createdAt ?? input.createdAt, updatedAt: Date.now() }),
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to update blog" }, { status: 500 });
        }

        const previousHeroPath = deriveBlobUrl(existing?.heroMediaPath ?? existing?.mediaPath, existing?.heroMediaUrl ?? existing?.mediaUrl);
        const nextHeroPath = deriveBlobUrl(input.heroMediaPath, input.heroMediaUrl);
        if (previousHeroPath && previousHeroPath !== nextHeroPath) {
            await deleteMediaFile(previousHeroPath, existing?.heroMediaUrl ?? existing?.mediaUrl);
        }

        const previousPagePath = deriveBlobUrl(existing?.pageMediaPath ?? existing?.mediaPath, existing?.pageMediaUrl ?? existing?.mediaUrl);
        const nextPagePath = deriveBlobUrl(input.pageMediaPath, input.pageMediaUrl);
        if (previousPagePath && previousPagePath !== nextPagePath && previousPagePath !== nextHeroPath) {
            await deleteMediaFile(previousPagePath, existing?.pageMediaUrl ?? existing?.mediaUrl);
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to update blog" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        if (!DB_URL) {
            return NextResponse.json({ error: "Firebase database is not configured" }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const id = parseId(searchParams.get("blogId"));
        if (!id) {
            return NextResponse.json({ error: "blogId is required" }, { status: 400 });
        }

        const existing = await fetchBlog(id);
        const response = await fetch(`${DB_URL}/blogs/${id}.json`, { method: "DELETE" });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to delete blog" }, { status: 500 });
        }

        const heroPath = deriveBlobUrl(existing?.heroMediaPath ?? existing?.mediaPath, existing?.heroMediaUrl ?? existing?.mediaUrl);
        const pagePath = deriveBlobUrl(existing?.pageMediaPath ?? existing?.mediaPath, existing?.pageMediaUrl ?? existing?.mediaUrl);

        await deleteMediaFile(heroPath, existing?.heroMediaUrl ?? existing?.mediaUrl);
        if (pagePath && pagePath !== heroPath) {
            await deleteMediaFile(pagePath, existing?.pageMediaUrl ?? existing?.mediaUrl);
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete blog" }, { status: 500 });
    }
}
