"use client"

import Link from "next/link"
import Image from "next/image"
import { Fiction } from "@/types/types"
import { useEffect, useState } from "react"
import { useParams, notFound } from "next/navigation"
import FavoriteButton from "@/components/FavoriteButton"

export default function FictionPage() {
    const { fiction_id } = useParams()

    const [loading, setLoading] = useState(true)
    const [fiction, setFiction] = useState<Fiction | null>(null)
    const [showFullSynopsis, setShowFullSynopsis] = useState(false)

    useEffect(() => {
        async function fetchFiction() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}`, {
                    cache: "no-store",
                    credentials: "include",
                })

                if (!res.ok) {
                    throw new Error("Failed to fetch fiction data")
                }

                const data = await res.json()
                setFiction(data.Fiction)
            } catch (error) {
                console.error(error)
                setFiction(null)
            } finally {
                setLoading(false)
            }
        }
        fetchFiction()
    }, [fiction_id])

    if (loading) {
        return <p className="text-center py-10 text-gray-400">Loading...</p>
    }

    if (!fiction) {
        return notFound()
    }

    return (
        <div className="max-w-screen-xl mx-auto px-24 mt-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6 border border-gray-600 p-6 rounded-lg bg-gray-900">

                <div className="relative w-[250px] h-[375px] flex-shrink-0">
                    <Image
                        src={fiction.cover || "/default-cover.png"}
                        width={250}
                        height={375}
                        alt={fiction.title}
                        className="rounded-lg object-cover w-full h-full"
                    />
                    <div className="absolute bottom-2 right-2">
                        <FavoriteButton fictionID={fiction.id} />
                    </div>
                </div>

                <div className="flex-grow space-y-4">
                    <h1 className="text-3xl font-bold text-gray-200">{fiction.title}</h1>

                    {fiction.subtitle && (
                        <p className="text-lg text-gray-400 italic">{fiction.subtitle}</p>
                    )}

                    <p className="text-gray-400">
                        Story: {fiction.author} 
                        {fiction.artist && <span> | Art: {fiction.artist}</span>}
                    </p>
                    <p className="text-sm text-gray-400">Contributor: {fiction.contributor_name}</p>

                    <p className="text-sm text-gray-400">Created: {new Date(fiction.created).toLocaleDateString()}</p>

                    <span className="mt-2 text-sm bg-gray-700 px-2 py-1 rounded-md text-gray-400">{fiction.status}</span>

                    <div className="mt-4 break-words">
                        <div
                            dangerouslySetInnerHTML={{ __html: fiction.synopsis }}
                            className={`formatted-content overflow-hidden transition-all text-gray-350 ${showFullSynopsis ? "max-h-full" : "max-h-[100px]"}`}
                        />
                        {fiction.synopsis.length > 200 && (
                            <button
                                className="text-blue-400 hover:underline mt-2"
                                onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                            >
                                {showFullSynopsis ? "See Less" : "See More"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Genres */}
            {fiction.genres?.length > 0 && (
                <section className="mt-6 border border-gray-600 p-4 rounded-lg bg-gray-900">
                    <h2 className="text-xl font-semibold text-gray-400">Genres</h2>

                    <div className="flex flex-wrap gap-2 mt-2">
                        {fiction.genres.map((genre) => (
                            <span key={genre.id} className="bg-gray-700 px-3 py-1 rounded-lg text-sm text-gray-400">
                                {genre.genre_name}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* Chapters */}
            {fiction.chapters?.length > 0 && (
                <section className="mt-6 border border-gray-600 p-4 rounded-lg bg-gray-900">
                    <h2 className="text-xl font-semibold text-gray-400">Chapters</h2>

                    <ul className="mt-2 space-y-2">
                        {fiction.chapters.map((chapter) => (
                            <Link key={chapter.id} href={`/f/${fiction.id}/${chapter.id}`} className="block">
                                <li className="border border-gray-600 p-2 rounded-lg bg-gray-800 flex justify-between items-center hover:bg-gray-700 transition">
                                    <span className="text-blue-400">{chapter.title}</span>
                                    <p className="text-sm text-gray-400">{new Date(chapter.created).toLocaleDateString()}</p>
                                </li>
                            </Link>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}
