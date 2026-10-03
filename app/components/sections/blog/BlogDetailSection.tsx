"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlogItem } from "./types";

type BlogDetailSectionProps = {
    blogId: string;
};

type StructuredSection = {
    heading: string;
    subHeading: string;
    paragraph: string;
    highlightHeading: string;
    highlightSubHeading: string;
    highlightParagraph: string;
    mediaType: string;
    mediaUrl: string;
    mediaPath: string;
};

function parseLegacyContent(content: string): StructuredSection[] {
    const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const sections: StructuredSection[] = [];
    let current: StructuredSection = { heading: "", subHeading: "", paragraph: "", highlightHeading: "", highlightSubHeading: "", highlightParagraph: "", mediaType: "image", mediaUrl: "", mediaPath: "" };

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

function getSections(blog: BlogItem | null): StructuredSection[] {
    if (!blog) return [];

    if (blog.contentSections && blog.contentSections.length > 0) {
        return blog.contentSections
            .map((section) => ({
                heading: section.heading?.trim() ?? "",
                subHeading: section.subHeading?.trim() ?? "",
                paragraph: section.paragraph?.trim() ?? "",
                highlightHeading: section.highlightHeading?.trim() ?? "",
                highlightSubHeading: section.highlightSubHeading?.trim() ?? "",
                highlightParagraph: section.highlightParagraph?.trim() ?? "",
                mediaType: section.mediaType ?? "image",
                mediaUrl: section.mediaUrl?.trim() ?? "",
                mediaPath: section.mediaPath?.trim() ?? "",
            }))
            .filter((section) => section.heading || section.subHeading || section.paragraph || section.highlightHeading || section.highlightSubHeading || section.highlightParagraph || section.mediaUrl);
    }

    return parseLegacyContent(blog.content ?? "");
}

function stripHtml(value: string) {
    return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function renderSectionMedia(mediaType: string, mediaUrl: string, title: string) {
    if (!mediaUrl) return null;

    if (mediaType === "image") {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt={title} className="h-auto mt-8 max-h-125 w-full rounded-[22px] object-cover" />
        );
    }

    return <video src={mediaUrl} controls className="h-auto max-h-125 w-full rounded-[22px] bg-black object-cover" />;
}

export default function BlogDetailSection({ blogId }: BlogDetailSectionProps) {
    const [blog, setBlog] = useState<BlogItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [shareStatus, setShareStatus] = useState("");

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const response = await fetch(`/api/blogs/${blogId}`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result?.error ?? "Failed to load blog");
                }

                if (!mounted) return;
                setBlog(result?.item as BlogItem);
            } catch (err) {
                if (!mounted) return;
                const message = err instanceof Error ? err.message : "Failed to load blog";
                setError(message);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [blogId]);

    const sections = useMemo(() => getSections(blog), [blog]);
    const toc = useMemo(
        () => sections.map((section) => stripHtml(section.heading)).filter(Boolean),
        [sections]
    );
    const heroMediaType = blog?.heroMediaType ?? blog?.mediaType ?? "image";
    const heroMediaUrl = blog?.heroMediaUrl ?? blog?.mediaUrl ?? "";

    const showShareStatus = (message: string) => {
        setShareStatus(message);
        window.setTimeout(() => setShareStatus(""), 2500);
    };

    const handleShare = async () => {
        if (!blog) return;

        try {
            const url = window.location.href;
            if (navigator.share) {
                await navigator.share({ title: blog.title, url });
                showShareStatus("Article shared");
            } else {
                await navigator.clipboard.writeText(url);
                showShareStatus("Link copied");
            }
        } catch (shareError) {
            if (shareError instanceof DOMException && shareError.name === "AbortError") return;
            showShareStatus("Unable to share. Please copy the page URL.");
        }
    };

    if (isLoading) {
        return (
            <section className="page-px w-full bg-[#f4f4f4] py-4 lg:py-10 xl:py-14">
                <div className="mx-auto w-full max-w-372 space-y-6">
                    <div className="h-105 animate-pulse rounded-[28px] bg-[#dcdcdc]" />
                    <div className="h-10 w-2/3 animate-pulse rounded bg-[#e7e7e7]" />
                    <div className="h-5 w-1/3 animate-pulse rounded bg-[#ececec]" />
                    <div className="space-y-3">
                        <div className="h-5 w-full animate-pulse rounded bg-[#ececec]" />
                        <div className="h-5 w-[95%] animate-pulse rounded bg-[#ececec]" />
                        <div className="h-5 w-[88%] animate-pulse rounded bg-[#ececec]" />
                    </div>
                </div>
            </section>
        );
    }

    if (error || !blog) {
        return (
            <section className="page-px w-full bg-[#f4f4f4] py-4 lg:py-10 xl:py-14">
                <div className="mx-auto w-full max-w-372 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-red-700">
                    {error || "Blog not found"}
                </div>
            </section>
        );
    }

    return (
        <section className="page-px w-full bg-[#f4f4f4] py-4 lg:py-10 xl:py-14">
            <div className="mx-auto w-full max-w-372">
                <div className="overflow-hidden rounded-[28px] border border-[#d8d8d8]">
                    {heroMediaType === "video" ? (
                        <video className="h-auto max-h-155 w-full bg-black object-cover" controls>
                            <source src={heroMediaUrl} />
                        </video>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={heroMediaUrl} alt={blog.title} className="h-auto max-h-155 w-full object-cover" />
                    )}
                </div>

                <div className="relative mt-12 pl-0 lg:pl-16">
                    <div className="absolute left-0 top-1 hidden h-72 items-center lg:flex">
                        <div className="flex h-full flex-col items-center justify-between">
                            <p className="[writing-mode:vertical-rl] rotate-180 font-nimbus text-[9px] uppercase tracking-[0.28em] text-[#a8a8a8]">
                                Share This Article
                            </p>
                            <button
                                type="button"
                                aria-label="Share this article"
                                onClick={handleShare}
                                className="flex size-10 items-center justify-center rounded-full bg-[#0f1f30] text-white"
                            >
                                ↗
                            </button>
                            <span className="sr-only" aria-live="polite">{shareStatus}</span>
                            <div className="h-18 w-px bg-[#d2d2d2]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-14">
                        <article className="min-w-0 space-y-10 overflow-hidden">
                            <div className="space-y-5 border-l-4 border-[#9fb40d] pl-4 sm:pl-6">
                                <h1 className="max-w-150 font-space-grotesk text-[40px] leading-10 font-bold text-[#111] sm:text-[48px] sm:leading-12 ">
                                    {blog.title}
                                </h1>
                                <div className="flex flex-wrap items-start gap-6 font-nimbus text-[12px] uppercase tracking-[0.08em] text-[#9a9a9a]">
                                    <div className="space-y-1">
                                        <p>Published</p>
                                        <p className="text-[14px] font-bold normal-case tracking-normal text-[#2f2f2f]">
                                            {new Date(blog.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p>Reading Time</p>
                                        <p className="text-[14px] normal-case tracking-normal text-[#9fb40d]">{blog.readMinutes} min</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleShare}
                                        className="inline-flex items-center gap-2 rounded-full bg-[#0f1f30] px-4 py-2 font-nimbus text-sm text-white lg:hidden"
                                    >
                                        Share article <span aria-hidden="true">↗</span>
                                    </button>
                                    <span className="sr-only" aria-live="polite">{shareStatus}</span>
                                </div>
                            </div>

                            <aside className="h-fit min-w-0 overflow-hidden rounded-[18px] bg-[#081320] px-5 py-5 text-white lg:hidden">
                                <p className="font-space-grotesk text-[15px] font-semibold text-[#9fb40d]">In This Article</p>
                                <ul className="mt-4 space-y-3">
                                    {toc.length === 0 ? (
                                        <li className="font-nimbus text-[12px] text-[#b8c4d0]">No headings available</li>
                                    ) : (
                                        toc.map((item, index) => (
                                            <li
                                                key={`${item}-${index}`}
                                                className="flex min-w-0 items-start gap-2 font-nimbus text-[12px] font-medium leading-5 text-white"
                                            >
                                                <span className="shrink-0 text-white">•</span>
                                                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </aside>

                            {sections.map((section, index) => (
                                <div key={index} className="space-y-5 mt-16">
                                    <div
                                        className="break-words font-space-grotesk text-[40px] leading-11 font-bold text-[#121212] [overflow-wrap:anywhere] [&_p]:m-0 [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0 [&_h4]:m-0 [&_h5]:m-0 [&_h6]:m-0 [&_h1]:text-[40px] [&_h1]:leading-11 [&_h1]:font-bold [&_h2]:text-[34px] [&_h2]:leading-10 [&_h2]:font-bold [&_h3]:text-3xl [&_h3]:font-semibold [&_h4]:text-2xl [&_h4]:font-semibold [&_h5]:text-xl [&_h5]:font-semibold [&_h6]:text-lg [&_h6]:font-semibold [&_h6]:uppercase [&_h6]:tracking-[0.08em]"
                                        dangerouslySetInnerHTML={{ __html: section.heading }}
                                    />
                                    <div
                                        className="mt-8 break-words font-space-grotesk text-[34px] leading-10 font-bold text-[#121212] [overflow-wrap:anywhere] [&_p]:m-0 [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0 [&_h4]:m-0 [&_h5]:m-0 [&_h6]:m-0 [&_h1]:text-[34px] [&_h1]:leading-10 [&_h1]:font-bold [&_h2]:text-3xl [&_h2]:font-bold [&_h3]:text-2xl [&_h3]:font-semibold [&_h4]:text-xl [&_h4]:font-semibold [&_h5]:text-lg [&_h5]:font-semibold [&_h6]:text-base [&_h6]:font-semibold [&_h6]:uppercase [&_h6]:tracking-[0.08em]"
                                        dangerouslySetInnerHTML={{ __html: section.subHeading }}
                                    />
                                    <div
                                        className="break-words font-nimbus text-[17px] leading-7 text-[#535353] [overflow-wrap:anywhere] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                                        dangerouslySetInnerHTML={{ __html: section.paragraph }}
                                    />

                                    {(section.highlightHeading || section.highlightSubHeading || section.highlightParagraph) && (
                                        <div className="relative overflow-hidden rounded-[26px] border border-[#13202d] bg-[#081320] px-5 py-8 text-white shadow-[0_18px_50px_rgba(8,19,32,0.18)] sm:px-6 sm:py-10">
                                            <div className="absolute left-5 top-5 bottom-5 w-1 rounded-full bg-[#9fb40d]" />
                                            <div className="pl-5 sm:pl-6">
                                                {section.highlightHeading && (
                                                    <div
                                                        className="font-space-grotesk text-[22px] leading-7 font-bold text-white [&_p]:m-0 [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0 [&_h4]:m-0 [&_h5]:m-0 [&_h6]:m-0"
                                                        dangerouslySetInnerHTML={{ __html: section.highlightHeading }}
                                                    />
                                                )}
                                                {section.highlightSubHeading && (
                                                    <div
                                                        className="mt-2 font-nimbus text-[15px] leading-6 text-[#c5cfda] [&_p]:m-0 [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0 [&_h4]:m-0 [&_h5]:m-0 [&_h6]:m-0"
                                                        dangerouslySetInnerHTML={{ __html: section.highlightSubHeading }}
                                                    />
                                                )}
                                                {section.highlightParagraph && (
                                                    <div
                                                        className="mt-5 w-full font-nimbus text-[15px] leading-[1.6] text-[#8fa0ae] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                                                        dangerouslySetInnerHTML={{ __html: section.highlightParagraph }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {section.mediaUrl && <div className="mt-8">{renderSectionMedia(section.mediaType, section.mediaUrl, blog.title)}</div>}
                                </div>
                            ))}
                        </article>

                        <aside className="hidden h-fit min-w-0 overflow-hidden rounded-[18px] bg-[#081320] px-5 py-5 text-white lg:sticky lg:top-20 lg:block">
                            <p className="font-space-grotesk text-[15px] font-semibold text-[#9fb40d]">In This Article</p>
                            <ul className="mt-4 space-y-3">
                                {toc.length === 0 ? (
                                    <li className="font-nimbus text-[12px] text-[#b8c4d0]">No headings available</li>
                                ) : (
                                    toc.map((item, index) => (
                                        <li
                                            key={`${item}-${index}`}
                                            className="flex min-w-0 items-start gap-2 font-nimbus text-[12px] font-medium leading-5 text-white"
                                        >
                                            <span className="shrink-0 text-white">•</span>
                                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </aside>
                    </div>
                </div>
            </div>
            {shareStatus && (
                <div role="status" className="fixed bottom-6 right-6 z-50 rounded-lg bg-[#0f1f30] px-4 py-3 font-nimbus text-sm text-white shadow-xl">
                    {shareStatus}
                </div>
            )}
        </section>
    );
}
