"use client";

import { useEffect, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "@/lib/firebase";
import type { BlogContentSection, BlogItem, BlogRecord, BlogStatus, MediaType } from "@/app/components/sections/blog/types";
import RichTextEditor from "@/app/components/admin/RichTextEditor";

type BlogFormData = {
    title: string;
    readMinutes: number;
    status: BlogStatus;
    contentSections: BlogContentSection[];
    heroMediaType: MediaType;
    heroMediaUrl: string;
    heroMediaPath: string;
};

const createEmptySection = (): BlogContentSection => ({
    heading: "",
    subHeading: "",
    paragraph: "",
    highlightHeading: "",
    highlightSubHeading: "",
    highlightParagraph: "",
    mediaType: "image",
    mediaUrl: "",
    mediaPath: "",
});

function parseLegacyContent(content?: string): BlogContentSection[] {
    const lines = (content ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const sections: BlogContentSection[] = [];
    let current = createEmptySection();

    for (const line of lines) {
        if (line.startsWith("H1:")) {
            if (current.heading || current.subHeading || current.paragraph || current.highlightHeading || current.highlightSubHeading || current.highlightParagraph || current.mediaUrl) {
                sections.push(current);
                current = createEmptySection();
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

        current.paragraph = current.paragraph ? `${current.paragraph} ${line}` : line;
    }

    if (current.heading || current.subHeading || current.paragraph || current.highlightHeading || current.highlightSubHeading || current.highlightParagraph || current.mediaUrl) {
        sections.push(current);
    }

    return sections.length > 0 ? sections : [createEmptySection()];
}

function stripHtml(value: string) {
    return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

const emptyForm: BlogFormData = {
    title: "",
    readMinutes: 4,
    status: "draft",
    contentSections: [createEmptySection()],
    heroMediaType: "image",
    heroMediaUrl: "",
    heroMediaPath: "",
};

export function BlogsSection() {
    const [blogs, setBlogs] = useState<BlogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBlog, setEditingBlog] = useState<BlogItem | null>(null);
    const [error, setError] = useState("");
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [form, setForm] = useState<BlogFormData>(emptyForm);
    const [heroMediaPreview, setHeroMediaPreview] = useState("");
    const heroMediaFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const blogsRef = ref(database, "blogs");
        const unsubscribe = onValue(blogsRef, (snapshot) => {
            const data = (snapshot.val() as Record<string, BlogRecord> | null) ?? {};
            const list: BlogItem[] = Object.entries(data)
                .map(([id, value]) => ({ id: Number(id), ...value }))
                .filter((item) => Number.isInteger(item.id) && item.id > 0)
                .sort((a, b) => b.id - a.id);

            setBlogs(list);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleMediaFile = async (event: React.ChangeEvent<HTMLInputElement>, mediaRole: "hero" | "section", sectionIndex?: number) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError("");
        setIsUploadingMedia(true);

        try {
            const uploadData = new FormData();
            uploadData.append("file", file);
            const mediaType = mediaRole === "hero" ? form.heroMediaType : form.contentSections[sectionIndex ?? 0]?.mediaType ?? "image";
            uploadData.append("mediaType", mediaType);
            uploadData.append("mediaRole", mediaRole);

            const response = await fetch("/api/admin/blogs/upload-media", {
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
            if (mediaRole === "hero") {
                setHeroMediaPreview(uploadedUrl);
                setForm((prev) => ({ ...prev, heroMediaUrl: uploadedUrl, heroMediaPath: uploadedPath }));
            } else {
                setForm((prev) => ({
                    ...prev,
                    contentSections: prev.contentSections.map((section, index) =>
                        index === sectionIndex ? { ...section, mediaUrl: uploadedUrl, mediaPath: uploadedPath } : section
                    ),
                }));
            }
        } catch {
            setError("Media upload failed");
        } finally {
            setIsUploadingMedia(false);
        }
    };

    const resetMedia = (mediaRole: "hero" | "section", sectionIndex?: number) => {
        if (mediaRole === "hero") {
            setHeroMediaPreview("");
            setForm((prev) => ({ ...prev, heroMediaType: "image", heroMediaUrl: "", heroMediaPath: "" }));
            if (heroMediaFileRef.current) heroMediaFileRef.current.value = "";
            return;
        }

        setForm((prev) => ({
            ...prev,
            contentSections: prev.contentSections.map((section, index) =>
                index === sectionIndex ? { ...section, mediaType: "image", mediaUrl: "", mediaPath: "" } : section
            ),
        }));
    };

    const resetForm = () => {
        setEditingBlog(null);
        setForm(emptyForm);
        setHeroMediaPreview("");
        if (heroMediaFileRef.current) heroMediaFileRef.current.value = "";
    };

    const handleEdit = (blog: BlogItem) => {
        setEditingBlog(blog);
        setForm({
            title: blog.title,
            readMinutes: blog.readMinutes,
            status: blog.status,
            contentSections: (blog.contentSections && blog.contentSections.length > 0 ? blog.contentSections : parseLegacyContent(blog.content)).map((section) => ({
                heading: section.heading ?? "",
                subHeading: section.subHeading ?? "",
                paragraph: section.paragraph ?? "",
                highlightHeading: section.highlightHeading ?? "",
                highlightSubHeading: section.highlightSubHeading ?? "",
                highlightParagraph: section.highlightParagraph ?? "",
                mediaType: section.mediaType ?? "image",
                mediaUrl: section.mediaUrl ?? "",
                mediaPath: section.mediaPath ?? "",
            })),
            heroMediaType: blog.heroMediaType ?? blog.mediaType ?? "image",
            heroMediaUrl: blog.heroMediaUrl ?? blog.mediaUrl ?? "",
            heroMediaPath: blog.heroMediaPath ?? blog.mediaPath ?? "",
        });
        setHeroMediaPreview(blog.heroMediaUrl ?? blog.mediaUrl ?? "");
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.title || !form.heroMediaUrl) {
            setError("Please fill in all required fields");
            return;
        }

        if (form.readMinutes <= 0) {
            setError("Read minutes must be greater than 0");
            return;
        }

        if (isUploadingMedia) {
            setError("Please wait for media upload to finish");
            return;
        }

        setError("");

        const payload: Partial<BlogRecord> = {
            title: form.title,
            readMinutes: form.readMinutes,
            status: form.status,
            contentSections: form.contentSections.map((section) => ({
                heading: section.heading.trim(),
                subHeading: section.subHeading.trim(),
                paragraph: section.paragraph.trim(),
                highlightHeading: section.highlightHeading.trim(),
                highlightSubHeading: section.highlightSubHeading.trim(),
                highlightParagraph: section.highlightParagraph.trim(),
                mediaType: section.mediaType,
                mediaUrl: section.mediaUrl.trim(),
                mediaPath: section.mediaPath?.trim(),
            })),
            heroMediaType: form.heroMediaType,
            heroMediaUrl: form.heroMediaUrl,
            heroMediaPath: form.heroMediaPath,
            createdAt: editingBlog ? editingBlog.createdAt : Date.now(),
        };

        try {
            if (editingBlog) {
                const response = await fetch("/api/admin/blogs", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ blogId: editingBlog.id, payload }),
                });

                if (!response.ok) throw new Error("Failed to update blog");
            } else {
                const response = await fetch("/api/admin/blogs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) throw new Error("Failed to create blog");
            }

            setIsFormOpen(false);
            resetForm();
        } catch {
            setError("Failed to save blog. Please try again.");
        }
    };

    const handleDelete = async (blogId: number) => {
        if (!confirm("Delete this blog?")) return;

        const response = await fetch(`/api/admin/blogs?blogId=${blogId}`, { method: "DELETE" });
        if (!response.ok) {
            setError("Failed to delete blog. Please try again.");
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
                    <h2 className="font-space-grotesk text-2xl font-bold text-[#2d5a27]">Blogs</h2>
                    <p className="mt-1 text-sm text-[#7f7f7f] font-nimbus">Manage blog listing and detail page content</p>
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
                    {isFormOpen ? "Cancel" : "+ Add Blog"}
                </button>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 font-nimbus text-red-700">{error}</div>}

            {isFormOpen && (
                <div className="space-y-4 rounded-lg border border-[#e0e0e0] bg-white p-6 shadow-sm">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-[#2d5a27]">Read Minutes *</label>
                            <input type="number" min={1} value={form.readMinutes} onChange={(e) => setForm((p) => ({ ...p, readMinutes: Number(e.target.value) }))} className="w-full rounded-lg border border-[#cfcfcf] px-4 py-2" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-[#2d5a27]">Status</label>
                            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as BlogStatus }))} className="w-full rounded-lg border border-[#cfcfcf] bg-white px-4 py-2">
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#2d5a27]">Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Enter blog title"
                            className="mb-4 w-full rounded-lg border border-[#cfcfcf] px-4 py-2"
                        />
                        <div className="space-y-4">
                            {form.contentSections.map((section, index) => (
                                <div key={index} className="space-y-3 rounded-lg border border-[#e0e0e0] bg-[#fafafa] p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-[#2d5a27]">Section {index + 1}</p>
                                        {form.contentSections.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        contentSections: prev.contentSections.filter((_, sectionIndex) => sectionIndex !== index),
                                                    }));
                                                }}
                                                className="rounded border border-red-100 px-2 py-1 text-xs text-red-600"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#2d5a27]">Heading</label>
                                        <RichTextEditor
                                            value={section.heading}
                                            onChange={(value) => {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    contentSections: prev.contentSections.map((item, sectionIndex) =>
                                                        sectionIndex === index ? { ...item, heading: value } : item
                                                    ),
                                                }));
                                            }}
                                            minHeight={90}
                                            compact
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#2d5a27]">Sub Heading</label>
                                        <RichTextEditor
                                            value={section.subHeading}
                                            onChange={(value) => {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    contentSections: prev.contentSections.map((item, sectionIndex) =>
                                                        sectionIndex === index ? { ...item, subHeading: value } : item
                                                    ),
                                                }));
                                            }}
                                            minHeight={90}
                                            compact
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#2d5a27]">Paragraph</label>
                                        <RichTextEditor
                                            value={section.paragraph}
                                            onChange={(value) => {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    contentSections: prev.contentSections.map((item, sectionIndex) =>
                                                        sectionIndex === index ? { ...item, paragraph: value } : item
                                                    ),
                                                }));
                                            }}
                                            minHeight={150}
                                            compact
                                        />
                                    </div>

                                    <div className="space-y-3 rounded-lg border border-[#d8e2bb] bg-[#f7f9f0] p-4">
                                        <p className="text-sm font-semibold text-[#2d5a27]">Highlight Section</p>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#2d5a27]">Highlight Section Heading</label>
                                            <RichTextEditor
                                                value={section.highlightHeading}
                                                onChange={(value) => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        contentSections: prev.contentSections.map((item, sectionIndex) =>
                                                            sectionIndex === index ? { ...item, highlightHeading: value } : item
                                                        ),
                                                    }));
                                                }}
                                                minHeight={90}
                                                compact
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#2d5a27]">Highlight Section Subheading</label>
                                            <RichTextEditor
                                                value={section.highlightSubHeading}
                                                onChange={(value) => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        contentSections: prev.contentSections.map((item, sectionIndex) =>
                                                            sectionIndex === index ? { ...item, highlightSubHeading: value } : item
                                                        ),
                                                    }));
                                                }}
                                                minHeight={90}
                                                compact
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#2d5a27]">Highlight Section Paragraph</label>
                                            <RichTextEditor
                                                value={section.highlightParagraph}
                                                onChange={(value) => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        contentSections: prev.contentSections.map((item, sectionIndex) =>
                                                            sectionIndex === index ? { ...item, highlightParagraph: value } : item
                                                        ),
                                                    }));
                                                }}
                                                minHeight={150}
                                                compact
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 rounded-lg border border-[#d8e2bb] bg-white p-4">
                                        <p className="text-sm font-semibold text-[#2d5a27]">Section Media</p>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <select
                                                value={section.mediaType}
                                                onChange={(e) => {
                                                    const mediaType = e.target.value as MediaType;
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        contentSections: prev.contentSections.map((item, sectionIndex) =>
                                                            sectionIndex === index ? { ...item, mediaType, mediaUrl: "", mediaPath: "" } : item
                                                        ),
                                                    }));
                                                }}
                                                className="rounded-lg border border-[#cfcfcf] bg-white px-4 py-2 text-sm"
                                            >
                                                <option value="image">Photo</option>
                                                <option value="video">Video</option>
                                            </select>

                                            <input
                                                type="file"
                                                accept={section.mediaType === "image" ? "image/*" : "video/*"}
                                                onChange={(e) => handleMediaFile(e, "section", index)}
                                                className="hidden"
                                                id={`blog-section-media-input-${index}`}
                                            />
                                            <label htmlFor={`blog-section-media-input-${index}`} className="cursor-pointer rounded-lg bg-[#2d5a27] px-4 py-2 text-sm text-white">
                                                {isUploadingMedia ? "Uploading..." : `Choose Section ${section.mediaType === "image" ? "Image" : "Video"}`}
                                            </label>

                                            {section.mediaUrl && (
                                                <button type="button" onClick={() => resetMedia("section", index)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        {section.mediaUrl ? (
                                            <div className="overflow-hidden rounded-lg border border-[#e0e0e0] bg-[#f5f5f5]">
                                                {section.mediaType === "image" ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={section.mediaUrl} alt={`Section ${index + 1} preview`} className="h-auto max-h-80 w-full object-contain" />
                                                ) : (
                                                    <video src={section.mediaUrl} controls className="h-auto max-h-80 w-full bg-black object-contain" />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex h-30 items-center justify-center rounded-lg border-2 border-dashed border-[#e0e0e0] bg-[#fafafa]">
                                                <p className="text-sm text-[#9b9b9b]">No section media selected</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => {
                                    setForm((prev) => ({
                                        ...prev,
                                        contentSections: [...prev.contentSections, createEmptySection()],
                                    }));
                                }}
                                className="rounded-lg border border-[#2d5a27] px-4 py-2 text-sm font-medium text-[#2d5a27]"
                            >
                                + Add Content Section
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-[#2d5a27]">Hero Media *</label>
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                            <select
                                value={form.heroMediaType}
                                onChange={(e) => {
                                    const heroMediaType = e.target.value as MediaType;
                                    setForm((p) => ({ ...p, heroMediaType, heroMediaUrl: "", heroMediaPath: "" }));
                                    setHeroMediaPreview("");
                                    if (heroMediaFileRef.current) heroMediaFileRef.current.value = "";
                                }}
                                className="rounded-lg border border-[#cfcfcf] bg-white px-4 py-2"
                            >
                                <option value="image">Photo</option>
                                <option value="video">Video</option>
                            </select>

                            <input ref={heroMediaFileRef} type="file" accept={form.heroMediaType === "image" ? "image/*" : "video/*"} onChange={(e) => handleMediaFile(e, "hero")} className="hidden" id="blog-hero-media-input" />
                            <label htmlFor="blog-hero-media-input" className="cursor-pointer rounded-lg bg-[#2d5a27] px-4 py-2 text-sm text-white">
                                {isUploadingMedia ? "Uploading..." : `Choose Hero ${form.heroMediaType === "image" ? "Image" : "Video"}`}
                            </label>

                            {heroMediaPreview && (
                                <button type="button" onClick={() => resetMedia("hero")} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">
                                    Remove
                                </button>
                            )}
                        </div>

                        {heroMediaPreview ? (
                            <div className="overflow-hidden rounded-lg border border-[#e0e0e0] bg-[#f5f5f5]">
                                {form.heroMediaType === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={heroMediaPreview} alt="Hero preview" className="h-auto max-h-80 w-full object-contain" />
                                ) : (
                                    <video src={heroMediaPreview} controls className="h-auto max-h-80 w-full bg-black object-contain" />
                                )}
                            </div>
                        ) : (
                            <div className="flex h-30 items-center justify-center rounded-lg border-2 border-dashed border-[#e0e0e0] bg-[#fafafa]">
                                <p className="text-sm text-[#9b9b9b]">No hero media selected</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} disabled={isUploadingMedia} className="flex-1 rounded-lg bg-[#2d5a27] px-6 py-2 text-white disabled:opacity-70">
                            {editingBlog ? "Update Blog" : "Create Blog"}
                        </button>
                        <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="flex-1 rounded-lg bg-[#f5f5f5] px-6 py-2 text-[#2d5a27]">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {blogs.length === 0 ? (
                <div className="rounded-lg border border-[#e0e0e0] bg-white p-12 text-center">
                    <p className="mb-4 text-[#7f7f7f]">No blogs yet</p>
                    <p className="text-sm text-[#9b9b9b]">Create your first blog post to publish on /blog.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {blogs.map((blog) => (
                        <div key={blog.id} className="rounded-lg border border-[#e0e0e0] bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-[1px] text-[#9fb40d]">#{blog.id}</p>
                                    <h3 className="mt-1 font-space-grotesk text-lg font-bold text-[#2d5a27]">{blog.title}</h3>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#7f7f7f]">
                                        <span className="rounded-full bg-[#f5f5f5] px-3 py-1">{blog.status}</span>
                                        <span className="rounded-full bg-[#f5f5f5] px-3 py-1">hero: {blog.heroMediaType ?? blog.mediaType ?? "image"}</span>
                                        <span className="rounded-full bg-[#f5f5f5] px-3 py-1">page: {blog.pageMediaType ?? blog.mediaType ?? "image"}</span>
                                        <span className="rounded-full bg-[#f5f5f5] px-3 py-1">{blog.readMinutes} min</span>
                                        <span className="rounded-full bg-[#f5f5f5] px-3 py-1">/blog/{blog.id}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(blog)} className="rounded border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#2d5a27]">
                                        Edit
                                    </button>
                                    <button onClick={() => handleDelete(blog.id)} className="rounded border border-red-100 px-3 py-1.5 text-xs text-red-600">
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

export default BlogsSection;
