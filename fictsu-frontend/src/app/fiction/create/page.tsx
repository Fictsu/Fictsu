"use client"

import Image from "next/image"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Fiction, FictionForm, ChapterForm } from "@/types/types"

export default function FictionCreatePage() {
    const router = useRouter()
    const chapterForm = useForm<ChapterForm>()

    const [loading, setLoading] = useState(false)
    const [cover, setCover] = useState("/default-cover.png")
    const [fiction, setFiction] = useState<Fiction | null>(null)

    const { register, handleSubmit, formState: { errors } } = useForm<FictionForm>()

    const onSubmitFiction = async (data: FictionForm) => {
        setLoading(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/c`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            })

            if (response.ok) {
                const fictionData = await response.json()
                setFiction(fictionData)
            } else {
                console.error("Failed to create fiction")
            }
        } catch (error) {
            console.error("Error submitting fiction form", error)
        } finally {
            setLoading(false)
        }
    }

    const onSubmitChapter = async (data: ChapterForm) => {
        if (!fiction) {
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction.id}/c`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            })

            if (response.ok) {
                router.push(`/f/${fiction.id}`)
            } else {
                console.error("Failed to create chapter")
            }
        } catch (error) {
            console.error("Error submitting chapter form", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10 mb-10 border border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Create Fiction</h1>

            <form onSubmit={handleSubmit(onSubmitFiction)} className="space-y-6">
                <div className="flex gap-7">
                    <div className="relative">
                        <Image
                            src={cover}
                            alt="Fiction Cover"
                            width={230}
                            height={300}
                            className="rounded-lg shadow-md object-cover"
                        />
                    </div>
                    <div className="flex-1 space-y-4">
                        {/* Title */}
                        <div className="space-y-1">
                            <input
                                {...register("title", { required: "Title is required" })}
                                placeholder={errors.title ? errors.title.message : "Title"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.title ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

                        {/* Subtitle */}
                        <input
                            {...register("subtitle")}
                            placeholder="Subtitle"
                            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />

                        {/* Author */}
                        <div className="space-y-1">
                            <input
                                {...register("author", { required: "Author is required" })}
                                placeholder={errors.author ? errors.author.message : "Author"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.author ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

                        {/* Artist */}
                        <div className="space-y-1">
                            <input
                                {...register("artist", { required: "Artist is required" })}
                                placeholder={errors.artist ? errors.artist.message : "Artist"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.artist ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

                        {/* Status */}
                        <select
                            {...register("status")}
                            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pl-3"
                        >
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                            <option value="Hiatus">Hiatus</option>
                            <option value="Dropped">Dropped</option>
                        </select>
                    </div>
                </div>

                {/* Synopsis */}
                <div className="space-y-2">
                    <textarea
                        {...register("synopsis", { required: "Synopsis is required" })}
                        placeholder={errors.synopsis ? errors.synopsis.message : "Synopsis"}
                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${errors.synopsis ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                    />
                </div>

                <div className="flex justify-center mt-6">
                    <button
                        type="submit"
                        className={`w-full max-w-xs py-3 text-white font-semibold rounded-lg transition-all duration-300 ${
                            loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg"
                        }`}
                        disabled={loading}
                    >
                        {loading ? "Creating..." : "Create Fiction"}
                    </button>
                </div>
            </form>

            {fiction && (
                <div className="mt-10">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create First Chapter</h2>
                    <form onSubmit={chapterForm.handleSubmit(onSubmitChapter)} className="space-y-6">
                        <div className="space-y-2">
                            <input
                                {...chapterForm.register("title", { required: "Chapter title is required" })}
                                placeholder="Chapter Title *Required"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {chapterForm.formState.errors.title && <span className="text-red-500 text-sm">{chapterForm.formState.errors.title.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <textarea
                                {...chapterForm.register("content", { required: "Chapter content is required" })}
                                placeholder="Chapter Content *Required"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {chapterForm.formState.errors.content && <span className="text-red-500 text-sm">{chapterForm.formState.errors.content.message}</span>}
                        </div>

                        <div className="flex justify-center mt-6">
                            <button
                                type="submit"
                                className={`w-full max-w-xs py-3 text-white font-semibold rounded-lg transition-all duration-300 ${
                                    loading ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 shadow-lg"
                                }`}
                                disabled={loading}
                            >
                                {loading ? "Creating Chapter..." : "Create Chapter"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
