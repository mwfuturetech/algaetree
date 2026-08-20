import { NextResponse } from "next/server";
import type { BlogItem, BlogRecord } from "@/app/components/sections/blog/types";

const DB_URL =
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://algaetree-f345a-default-rtdb.asia-southeast1.firebasedatabase.app";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
    try {
        if (!DB_URL) {
            return NextResponse.json({ error: "Firebase database is not configured" }, { status: 500 });
        }

        const { id } = await context.params;
        const numericId = Number(id);
        if (!Number.isInteger(numericId) || numericId <= 0) {
            return NextResponse.json({ error: "Invalid blog id" }, { status: 400 });
        }

        const response = await fetch(`${DB_URL}/blogs/${numericId}.json`);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to load blog" }, { status: 500 });
        }

        const blog = (await response.json()) as BlogRecord | null;
        if (!blog || blog.status !== "published") {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }

        const item: BlogItem = { id: numericId, ...blog };
        return NextResponse.json({ item });
    } catch {
        return NextResponse.json({ error: "Failed to load blog" }, { status: 500 });
    }
}
