"use client"

import useSWR from "swr"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import "react-quill-new/dist/quill.snow.css"
import { use, useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import ChapterActions from "@/components/ChapterActions"
import { Fiction, FictionForm, Chapter } from "@/types/types"
import FloatingToolsMenu from "@/components/FloatingToolsMenu"

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })
const fetcher = (URL: string) => fetch(URL, { credentials: "include" }).then((res) => res.json())

export default function FictionEditPage({ params }: { params: Promise<{ fiction_id: string }> }) {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [cover, setCover] = useState("/default-cover.png")
    const [coverFile, setCoverFile] = useState<File | null>(null)

    const { fiction_id } = use(params)
    const fictionIDNumber = Number(fiction_id)
    const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FictionForm>()
    const { data: userData, error: userError } = useSWR(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/user`, fetcher
    )
    const { data: fictionData, error: fictionError, mutate } = useSWR<{ Fiction: Fiction }>(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}`, fetcher
    )

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setCoverFile(file)
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => setCover(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const onSubmit = async (formData: FictionForm) => {
        setLoading(true)
        const formDataObj = new FormData()
        formDataObj.append("cover", coverFile || "")
        Object.entries(formData).forEach(([key, value]) => formDataObj.append(key, value))
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}/u`, {
            method: "PUT",
            credentials: "include",
            body: formDataObj,
        })

        setLoading(false)
        if (!response.ok) {
            return alert("Failed to update fiction.")
        }

        alert("Fiction updated successfully!")
        mutate()
    }

    useEffect(() => {
        if (userError || fictionError) {
            alert("Failed to load data. Redirecting...")
            router.push("/")
            return
        }

        if (!userData || !fictionData?.Fiction) {
            return
        }

        if (!userData.User_Profile?.id || userData.User_Profile.id !== fictionData.Fiction.contributor_id) {
            alert("Unauthorized access. Redirecting...")
            router.push("/")
            return
        }

        reset(fictionData.Fiction)
        setCover(fictionData.Fiction.cover || "/default-cover.png")
    }, [userData, fictionData, fictionError, userError, reset, router])

    if (!fictionData || !userData) {
        return <p className="text-center mt-10">Loading...</p>
    }

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10 mb-10 border border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Edit Fiction</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex gap-7">
                    <div className="relative rounded-lg shadow-md cursor-pointer group">
                        <Image
                            src={cover}
                            width={230}
                            height={300}
                            alt="Fiction Cover"
                            className="rounded-lg object-cover"
                        />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-end justify-center opacity-0 group-hover:opacity-35 transition-opacity pb-34 rounded-lg">
                            <span className="text-white text-sm font-semibold">Upload Cover Image</span>
                        </div>

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="space-y-1">
                            <input
                                {...register("title", { required: "Title is required" })}
                                placeholder={errors.title ? errors.title.message : "Title"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.title ? "text-red-500 border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

                        <input
                            {...register("subtitle")}
                            placeholder="Subtitle"
                            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />

                        <div className="space-y-1">
                            <input
                                {...register("author", { required: "Author is required" })}
                                placeholder={errors.author ? errors.author.message : "Author"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.author ? "text-red-500 border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

                        <div className="space-y-1">
                            <input
                                {...register("artist", { required: "Artist is required" })}
                                placeholder={errors.artist ? errors.artist.message : "Artist *If no artsis, type N/A"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.artist ? "text-red-500 border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

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

                <div className="space-y-2">
                    <label className={`block font-medium ${errors.synopsis ? "text-red-500" : "text-gray-700"}`}>
                        {errors.synopsis ? errors.synopsis.message : "Synopsis"}
                    </label>

                    <div className={`border rounded-lg p-2 ${errors.synopsis ? "border-red-500" : "border-gray-300"} text-gray-900`}>
                        <Controller
                            name="synopsis"
                            control={control}
                            rules={{
                                required: "Synopsis is required",
                                validate: value => value.replace(/<[^>]+>/g, "").trim().length > 0 || "Synopsis is required"
                            }}
                            render={({ field }) => (
                                <ReactQuill 
                                    {...field} 
                                    theme="snow" 
                                    onChange={value => field.onChange(value.trim() ? value : "")} 
                                    placeholder="Write your synopsis here..."
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-center mt-6">
                    <button
                        type="submit"
                        className={`w-full max-w-xs py-3 text-white font-semibold rounded-lg transition-all duration-300 ${
                            loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg"
                        }`}
                        disabled={loading}
                    >
                        {loading ? "Updating..." : "Save Changes"}
                    </button>
                </div>
            </form>

            <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-800">Chapters</h2>

                {fictionData.Fiction.chapters && fictionData.Fiction.chapters.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                        {fictionData.Fiction.chapters.map((chapter: Chapter) => (
                            <li key={chapter.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-md">

                                <div className="flex-1">
                                    <Link href={`/f/${fiction_id}/${chapter.id}`} className="text-blue-600 hover:underline">
                                        {chapter.title}
                                    </Link>
                                    <p className="text-sm text-gray-600">Created on {new Date(chapter.created).toLocaleDateString()}</p>
                                </div>

                                <ChapterActions
                                    fictionID={fictionIDNumber}
                                    chapterID={chapter.id}
                                    contributorID={fictionData.Fiction.contributor_id}
                                    mutate={mutate}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-600 mt-4">No chapter</p>
                )}
            </div>

            <div className="flex justify-center mt-8 mb-0">
                <button
                    onClick={() => window.open(`/f/${fiction_id}/ch/create`, "_blank")}
                    className="w-full max-w-xs py-3 text-white font-semibold rounded-lg bg-green-600 hover:bg-green-700 shadow-lg transition-all duration-300"
                >
                    Add Chapter
                </button>
            </div>

            <FloatingToolsMenu />
        </div>
    )
}
