import { NextResponse } from "next/server";
import type { BlogItem, BlogRecord } from "@/app/components/sections/blog/types";

const DB_URL =
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://algaetree-f345a-default-rtdb.asia-southeast1.firebasedatabase.app";

export async function GET() {
    try {
        if (!DB_URL) {
            return NextResponse.json({ error: "Firebase database is not configured" }, { status: 500 });
        }

        const response = await fetch(`${DB_URL}/blogs.json`);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to load blogs" }, { status: 500 });
        }

        const raw = ((await response.json()) as Record<string, BlogRecord> | null) ?? {};
        const list: BlogItem[] = Object.entries(raw)
            .map(([id, value]) => ({ id: Number(id), ...value }))
            .filter((item) => Number.isInteger(item.id) && item.id > 0)
            .filter((item) => item.status === "published")
            .sort((a, b) => b.id - a.id);

        return NextResponse.json({ items: list });
    } catch {
        return NextResponse.json({ error: "Failed to load blogs" }, { status: 500 });
    }
}
