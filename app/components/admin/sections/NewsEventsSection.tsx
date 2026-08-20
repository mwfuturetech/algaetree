"use client";

import { useEffect, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "@/lib/firebase";

type MediaType = "image" | "video";

const IMAGE_EXTENSIONS = new Set([
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "avif",
    "bmp",
    "svg",
    "heic",
    "heif",
    "tif",
    "tiff",
    "ico",
]);

const VIDEO_EXTENSIONS = new Set([
    "mp4",
    "webm",
    "mov",
    "ogv",
    "ogg",
    "m4v",
    "avi",
    "mkv",
    "wmv",
    "flv",
    "mpeg",
    "mpg",
    "3gp",
]);

interface NewsEventItem {
    id: string;
    category: string;
    title: string;
    excerpt: string;
    mediaType: MediaType;
    mediaUrl: string;
    mediaPath?: string;
    link: string;
    createdAt: number;
}

interface NewsEventFormData {
    category: string;
    title: string;
    excerpt: string;
    mediaType: MediaType;
    mediaUrl: string;
    mediaPath?: string;
    link: string;
}

const emptyForm: NewsEventFormData = {
    category: "",
    title: "",
    excerpt: "",
    mediaType: "image",
    mediaUrl: "",
    mediaPath: "",
    link: "",
};

export function NewsEventsSection() {
    const [items, setItems] = useState<NewsEventItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NewsEventItem | null>(null);
    const [error, setError] = useState("");
    const [form, setForm] = useState<NewsEventFormData>(emptyForm);
    const [mediaPreview, setMediaPreview] = useState("");
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const mediaFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const newsEventsRef = ref(database, "newsEvents");
        const unsubscribe = onValue(newsEventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list: NewsEventItem[] = Object.entries(data).map(([id, value]) => {
                    const record = value as Partial<NewsEventItem> & { mediaUrl?: string };
                    const mediaUrl = record.mediaUrl ?? "";
                    const mediaType = record.mediaType ?? inferMediaType(mediaUrl);

                    return {
                        id,
                        category: record.category ?? "",
                        title: record.title ?? "",
                        excerpt: record.excerpt ?? "",
                        mediaType,
                        mediaUrl,
                        mediaPath: typeof record.mediaPath === "string" ? record.mediaPath : "",
                        link: record.link ?? "",
                        createdAt: record.createdAt ?? Date.now(),
                    };
                });
                list.sort((a, b) => b.createdAt - a.createdAt);
                setItems(list);
            } else {
                setItems([]);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const inferMediaType = (value: string): MediaType => {
        const lower = value.toLowerCase();
        if (lower.startsWith("data:video")) {
            return "video";
        }

        if (lower.startsWith("data:image")) {
            return "image";
        }

        try {
            const url = new URL(value);
            const extension = url.pathname.split(".").pop()?.toLowerCase() ?? "";
            if (VIDEO_EXTENSIONS.has(extension)) return "video";
            if (IMAGE_EXTENSIONS.has(extension)) return "image";
        } catch {
            const extension = lower.split("?")[0].split("#")[0].split(".").pop() ?? "";
            if (VIDEO_EXTENSIONS.has(extension)) return "video";
            if (IMAGE_EXTENSIONS.has(extension)) return "image";
        }

        return "image";
    };

    const handleMediaFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError("");
        setIsUploadingMedia(true);

        try {
            const uploadData = new FormData();
            uploadData.append("file", file);
            uploadData.append("mediaType", form.mediaType);

            const response = await fetch("/api/admin/news-events/upload-media", {
                method: "POST",
                body: uploadData,
            });
            const result = await response.json();

            if (!response.ok) {
                setError(result?.error ?? "Media upload failed");
                return;
            }

            const uploadedUrl = result?.url as string;
            const uploadedPath = result?.mediaPath as string;
            setMediaPreview(uploadedUrl);
            setForm((prev) => ({ ...prev, mediaUrl: uploadedUrl, mediaPath: uploadedPath }));
        } catch {
            setError("Media upload failed");
        } finally {
            setIsUploadingMedia(false);
        }
    };

    const resetMedia = () => {
        setMediaPreview("");
        setForm((prev) => ({ ...prev, mediaUrl: "", mediaPath: "", mediaType: "image" }));
        if (mediaFileRef.current) mediaFileRef.current.value = "";
    };

    const resetForm = () => {
        setEditingItem(null);
        setForm(emptyForm);
        resetMedia();
    };

    const handleEdit = (item: NewsEventItem) => {
        setEditingItem(item);
        setForm({
            category: item.category,
            title: item.title,
            excerpt: item.excerpt,
            mediaType: item.mediaType,
            mediaUrl: item.mediaUrl,
            mediaPath: item.mediaPath,
            link: item.link,
        });
        setMediaPreview(item.mediaUrl);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (isUploadingMedia) {
            setError("Please wait for media upload to finish");
            return;
        }

        setError("");

        try {
            const payload = {
                category: form.category,
                title: form.title,
                excerpt: form.excerpt,
                mediaType: form.mediaType,
                mediaUrl: form.mediaUrl,
                mediaPath: form.mediaPath || "",
                link: form.link,
                createdAt: editingItem ? editingItem.createdAt : Date.now(),
            };

            if (editingItem) {
                const response = await fetch("/api/admin/news-events", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newsEventId: editingItem.id, payload }),
                });

                if (!response.ok) {
                    throw new Error("Failed to update news item");
                }
            } else {
                const response = await fetch("/api/admin/news-events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error("Failed to create news item");
                }
            }

            setIsFormOpen(false);
            resetForm();
        } catch {
            setError("Failed to save news item. Please try again.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this news item?")) return;

        const response = await fetch(`/api/admin/news-events?newsEventId=${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            setError("Failed to delete news item. Please try again.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2d5a27]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#2d5a27] font-space-grotesk">News & Events</h2>
                    <p className="mt-1 text-sm text-[#7f7f7f] font-nimbus">Upload image or video news cards for the public page</p>
                </div>

                <button
                    onClick={() => {
                        if (isFormOpen) {
                            setIsFormOpen(false);
                            resetForm();
                            return;
                        }

                        resetForm();
                        setIsFormOpen(true);
                    }}
                    className="rounded-lg bg-[#2d5a27] px-6 py-2 font-nimbus font-medium text-white transition-colors hover:bg-[#1b5e20]"
                >
                    {isFormOpen ? "Cancel" : "+ Add News Item"}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 font-nimbus text-red-700">
                    {error}
                </div>
            )}

            {isFormOpen && (
                <div className="space-y-4 rounded-lg border border-[#e0e0e0] bg-white p-6 shadow-sm">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-[#2d5a27] font-nimbus">Category *</label>
                            <input
                                type="text"
                                value={form.category}
                                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                                placeholder="GREEN TECH LAUNCH"
                                className="w-full rounded-lg border border-[#cfcfcf] px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-[#2d5a27] font-nimbus">Media Type *</label>
                            <select
                                value={form.mediaType}
                                onChange={(event) => {
                                    const mediaType = event.target.value as MediaType;
                                    setForm((prev) => ({ ...prev, mediaType, mediaUrl: "" }));
                                    setMediaPreview("");
                                    if (mediaFileRef.current) mediaFileRef.current.value = "";
                                }}
                                className="w-full rounded-lg border border-[#cfcfcf] bg-white px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
                            >
                                <option value="image">Photo</option>
                                <option value="video">Video</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#2d5a27] font-nimbus">Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder="AlgaeTree Launch Marks a New Green Chapter for Bhopal"
                            className="w-full rounded-lg border border-[#cfcfcf] px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#2d5a27] font-nimbus">Excerpt *</label>
                        <textarea
                            value={form.excerpt}
                            onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                            placeholder="The coverage highlighted AlgaeTree as a futuristic microalgae-powered system designed to support carbon capture, oxygen release, and cleaner city spaces."
                            rows={4}
                            className="w-full resize-none rounded-lg border border-[#cfcfcf] px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#2d5a27] font-nimbus">Read More URL</label>
                        <input
                            type="url"
                            value={form.link}
                            onChange={(event) => setForm((prev) => ({ ...prev, link: event.target.value }))}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-[#cfcfcf] px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#2d5a27] font-nimbus">Media *</label>
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                            <input
                                ref={mediaFileRef}
                                type="file"
                                accept={form.mediaType === "image" ? "image/*" : "video/*"}
                                onChange={handleMediaFile}
                                className="hidden"
                                id="news-events-media-input"
                            />
                            <label
                                htmlFor="news-events-media-input"
                                className="cursor-pointer rounded-lg bg-[#2d5a27] px-4 py-2 text-sm font-nimbus text-white transition-colors hover:bg-[#1b5e20]"
                            >
                                {isUploadingMedia ? "Uploading..." : `Choose ${form.mediaType === "image" ? "Photo" : "Video"}`}
                            </label>

                            {mediaPreview && (
                                <button
                                    type="button"
                                    onClick={resetMedia}
                                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-nimbus text-red-600 transition-colors hover:bg-red-50"
                                >
                                    Remove
                                </button>
                            )}
                        </div>

                        {mediaPreview ? (
                            <div className="overflow-hidden rounded-lg border border-[#e0e0e0] bg-[#f5f5f5]">
                                {form.mediaType === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={mediaPreview} alt="Preview" className="h-auto max-h-80 w-full object-contain" />
                                ) : (
                                    <video src={mediaPreview} controls className="h-auto max-h-80 w-full bg-black object-contain" />
                                )}
                            </div>
                        ) : (
                            <div className="flex h-30 items-center justify-center rounded-lg border-2 border-dashed border-[#e0e0e0] bg-[#fafafa]">
                                <p className="text-sm text-[#9b9b9b] font-nimbus">No media selected</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={isUploadingMedia}
                            className="flex-1 rounded-lg bg-[#2d5a27] px-6 py-2 font-nimbus font-medium text-white transition-colors hover:bg-[#1b5e20] disabled:opacity-70"
                        >
                            {editingItem ? "Update News Item" : "Create News Item"}
                        </button>
                        <button
                            onClick={() => {
                                setIsFormOpen(false);
                                resetForm();
                            }}
                            className="flex-1 rounded-lg bg-[#f5f5f5] px-6 py-2 font-nimbus font-medium text-[#2d5a27] transition-colors hover:bg-[#e0e0e0]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {items.length === 0 ? (
                <div className="rounded-lg border border-[#e0e0e0] bg-white p-12 text-center">
                    <p className="mb-4 font-nimbus text-[#7f7f7f]">No news items yet</p>
                    <p className="text-sm text-[#9b9b9b]">Add the first image or video news card to populate the public News & Events page.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-[#e0e0e0] bg-white p-4 transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-[1px] text-[#9fb40d] font-nimbus">{item.category}</p>
                                    <h3 className="mt-1 font-space-grotesk text-lg font-bold text-[#2d5a27]">{item.title}</h3>
                                    <p className="mt-1 text-sm text-[#7f7f7f] font-nimbus">{item.excerpt}</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-nimbus text-[#7f7f7f]">
                                        <span className="rounded-full bg-[#f5f5f5] px-3 py-1">{item.mediaType}</span>
                                        {item.link && <span className="truncate max-w-65">{item.link}</span>}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="rounded border border-[#e0e0e0] px-3 py-1.5 text-xs font-nimbus text-[#2d5a27] transition-colors hover:bg-[#f5f5f5]"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="rounded border border-red-100 px-3 py-1.5 text-xs font-nimbus text-red-600 transition-colors hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default NewsEventsSection;