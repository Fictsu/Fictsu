"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Fiction, Chapter } from "@/types/types"
import { useParams, notFound } from "next/navigation"

export default function ChapterPage() {
    const [loading, setLoading] = useState(true)
    const [chapter, setChapter] = useState<Chapter | null>(null)
    const [fiction, setFiction] = useState<Fiction | null>(null)

    const { fiction_id, chapter_id } = useParams()

    useEffect(() => {
        async function fetchData() {
            try {
                const [chapterRes, fictionRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}/${chapter_id}`, {
                        cache: "no-store",
                        credentials: "include",
                    }),
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}`, {
                        cache: "no-store",
                    }),
                ])

                if (!chapterRes.ok || !fictionRes.ok) {
                    throw new Error("Data not found")
                }

                const chapterData = await chapterRes.json()
                const fictionData = await fictionRes.json()

                setChapter(chapterData)
                setFiction({
                    ...fictionData.Fiction,
                    chapters: fictionData.Fiction.chapters || [],
                })
            } catch (error) {
                console.error(error)
                setChapter(null)
                setFiction(null)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [fiction_id, chapter_id])

    if (loading) {
        return <p className="text-center py-10 text-gray-400">Loading...</p>
    }

    if (!chapter || !fiction) {
        notFound()
    }

    const chapters = fiction.chapters || []
    const currentIndex = chapters.findIndex((ch) => ch.id === parseInt(chapter_id as string, 10))

    const prevChapterID = currentIndex > 0 ? chapters[currentIndex - 1].id : null
    const nextChapterID = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1].id : null

    return (
        <div className="w-full max-w-screen-lg mx-auto px-8 md:px-24 mt-6 mb-6">
            <h1 className="text-4xl font-bold text-gray-100">{chapter.title}</h1>

            <p className="text-gray-400 text-sm mt-2">
                Published on {new Date(chapter.created).toLocaleDateString()}
            </p>

            <div
                dangerouslySetInnerHTML={{ __html: formatChapterContent(chapter.content) }}
                className="formatted-content mt-6 text-lg leading-loose text-gray-100 space-y-6"
            />

            <div className="mt-12 flex justify-between items-center border-t pt-6">
                {prevChapterID ? (
                    <Link
                        href={`/f/${fiction_id}/${prevChapterID}`}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all"
                    >
                        ← Previous Chapter
                    </Link>
                ) : (
                    <span className="px-6 py-3 text-gray-400">← Previous Chapter</span>
                )}

                <Link
                    href={`/f/${fiction_id}`}
                    className="px-6 py-3 bg-gray-300 text-gray-900 rounded-xl shadow-md hover:bg-gray-400 transition-all"
                >
                    Back to Fiction
                </Link>

                {nextChapterID ? (
                    <Link
                        href={`/f/${fiction_id}/${nextChapterID}`}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all"
                    >
                        Next Chapter →
                    </Link>
                ) : (
                    <span className="px-6 py-3 text-gray-400">Next Chapter →</span>
                )}
            </div>
        </div>
    )
}

function formatChapterContent(raw: string): string {
    const imageURLRegex = /https:\/\/storage\.googleapis\.com\/[^\s"'<>]+?\.(jpg|jpeg|png|gif|webp)(\?[^\s"'<>]*)?/gi

    // Step 1: Extract all image URLs and render them as styled <img> blocks
    const uniqueImages = [...new Set(raw.match(imageURLRegex) || [])]

    let sanitized = raw

    // Replace all image URLs with empty string (we'll insert the image blocks later)
    for (const URL of uniqueImages) {
        sanitized = sanitized.replace(URL, "")
    }
  
    // Remove all broken <img> tags — especially ones like <img> inside <p>
    sanitized = sanitized.replace(/<img[^>]*>/gi, "")

    // Remove broken or stray <p> tags wrapping images
    sanitized = sanitized.replace(/<p[^>]*>\s*<\/p>/gi, "")

    // Replace any hanging &gt; or > at beginning of lines
    sanitized = sanitized.replace(/&gt;|>\s*/g, "")

    // Add all image blocks cleanly
    const imageBlocks = uniqueImages.map((URL) => {
        return `
            <div class="my-6 flex justify-center">
                <img
                    src="${URL}"
                    alt="Chapter image"
                    class="max-w-[80%] border border-gray-500 shadow-md transition-transform hover:scale-105 duration-300"
                    loading="lazy"
                    style="height:auto;"
                />
            </div>`
    }).join("\n")

    return `<div>${imageBlocks}\n${sanitized.trim()}</div>`
}
