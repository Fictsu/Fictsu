import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { Fiction, Chapter } from "@/types/types"

async function fetchData<T>(URL: string): Promise<T | null> {
    try {
        const res = await fetch(URL, { cache: "no-store", credentials: "include" })
        if (!res.ok) {
            throw new Error(`Failed to fetch data from ${URL}`)
        }

        return res.json()
    } catch (error) {
        console.error(error)
        return null
    }
}

async function getFiction(fictionID: string): Promise<Fiction | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fictionID}`, {
            cache: "no-store",
        })

        if (!res.ok) {
            throw new Error("Failed to fetch fiction data")
        }

        const data = await res.json()
        return { ...data.Fiction, chapters: data.Fiction.chapters || [] }
    } catch (error) {
        console.error(error)
        return null
    }
}

async function getChapter(fictionID: string, chapterID: string): Promise<Chapter | null> {
    return fetchData<Chapter>(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fictionID}/${chapterID}`)
}

export default async function ChapterPage({ params }: { params: { fiction_id: string, chapter_id: string } }) {
    const { fiction_id, chapter_id } = await Promise.resolve(params)
    const chapterIDInt = parseInt(chapter_id, 10)

    const [chapter, fiction] = await Promise.all(
        [
            getChapter(fiction_id, chapter_id),
            getFiction(fiction_id),
        ]
    )

    if (!chapter || !fiction) {
        notFound()
    }

    const chapters = fiction.chapters || []
    const currentIndex = chapters.findIndex((ch) => ch.id === chapterIDInt)
    const prevChapterID = currentIndex > 0 ? chapters[currentIndex - 1].id : null
    const nextChapterID = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1].id : null

    return (
        <div className="w-full max-w-screen-lg mx-auto px-8 md:px-24 mt-6 mb-6">
            <h1 className="text-4xl font-bold text-gray-100">{chapter.title}</h1>
            <p className="text-gray-400 text-sm mt-2">
                Published on {new Date(chapter.created).toLocaleDateString()}
            </p>

            <div
                className="formatted-content mt-6 text-lg leading-loose text-gray-100 space-y-6"
                dangerouslySetInnerHTML={{ __html: formatChapterContent(chapter.content) }}
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

function formatChapterContent(content: string): string {
    return content.replace(
        /(https:\/\/storage\.googleapis\.com\/[^\s"<>'()]+)/g,
        (URL) => {
            const cleanURL = URL.split('?')[0]
            if (cleanURL.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                return `
                    <div class="my-6 flex justify-center">
                        <img 
                            src="${URL}" 
                            alt="Chapter image"
                            class="max-w-[80%] border border-gray-500 shadow-md transition-transform hover:scale-105 duration-300"
                            loading="lazy"
                            style="height: auto;"
                        />
                    </div>
                `
            }

            return `<a href="${URL}" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline break-words">${URL}</a>`
        }
    )
}
