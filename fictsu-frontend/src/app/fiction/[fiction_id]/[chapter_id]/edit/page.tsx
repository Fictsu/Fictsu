"use client"

import useSWR from "swr"
import dynamic from "next/dynamic"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { ChapterForm } from "@/types/types"
import "react-quill-new/dist/quill.snow.css"
import { use, useState, useEffect } from "react"
import FloatingToolsMenu from "@/components/FloatingToolsMenu"

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })
const fetcher = (URL: string) => fetch(URL, { credentials: "include" }).then((res) => res.json())

export default function ChapterEditPage({ params }: { params: Promise<{ fiction_id: string; chapter_id: string }> }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [editorContent, setEditorContent] = useState<string>("")
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const { fiction_id, chapter_id } = use(params)

    const { data: userData, error: userError } = useSWR(`${process.env.NEXT_PUBLIC_BACKEND_API}/user`, fetcher)
    const { data: fictionData, error: fictionError } = useSWR(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}`, fetcher)

    const { data: chapterData, error: chapterError, mutate } = useSWR(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}/${chapter_id}`,
        fetcher,
        {
            onSuccess: (data) => {
                if (data?.content) {
                    setEditorContent(data.content) // Immediately set content when data is available
                    setValue("content", data.content)
                }
            }
        }
    )

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<ChapterForm>()

    const redirectWithMessage = (message: string, path: string) => {
        setErrorMessage(message)
        setTimeout(() => router.push(path), 2500)
    }

    useEffect(() => {
        if (userError || fictionError || chapterError) {
            return redirectWithMessage("Failed to load data. Redirecting...", "/user")
        }

        if (!userData || !fictionData?.Fiction || !chapterData) {
            return
        }

        const userID = userData.User_Profile?.id
        const contributorID = fictionData.Fiction.contributor_id
        if (!userID) {
            return redirectWithMessage("You must be logged in. Redirecting...", "/")
        }

        if (userID !== contributorID) {
            return redirectWithMessage("You are not the contributor. Redirecting...", "/")
        }

        setValue("title", chapterData.title)
    }, [userData, fictionData, chapterData, setValue, router, userError, fictionError, chapterError])

    const onSubmit = async (formData: ChapterForm) => {
        setLoading(true)
        setErrorMessage(null)

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}/${chapter_id}/u`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(formData),
        })

        setLoading(false)
        if (!response.ok) {
            return setErrorMessage("Failed to update chapter.")
        }

        alert("Chapter updated successfully!")

        mutate() // Refresh data after update

        setEditorContent(formData.content) // Update editor content after submission

        router.push(`/f/${fiction_id}/${chapter_id}`)
    }

    if (!userData || !fictionData || !chapterData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <p className="text-gray-700 text-lg font-medium animate-pulse">Loading...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10 border border-gray-200 mb-10">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Edit Chapter</h1>

            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-md mb-6 text-center">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <div>
                    <label className="block text-gray-800 font-medium mb-2">Title</label>
                    <input 
                        {...register("title", { required: true })} 
                        placeholder="Enter chapter title"
                        className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 outline-none transition-all duration-200 text-gray-900"
                        disabled={loading}
                    />
                    {errors.title && <span className="text-red-500 text-sm">Title is required</span>}
                </div>

                <div>
                    <label className="block text-gray-800 font-medium mb-2">Content</label>
                    <ReactQuill
                        value={editorContent}
                        onChange={(content) => {
                            setEditorContent(content)
                            setValue("content", content)
                        }}
                        className="w-full p-0 bg-white rounded-lg focus:ring-4 focus:ring-blue-300 outline-none transition-all duration-200 text-gray-900"
                        placeholder="Write your chapter content here..."
                    />
                    {errors.content && <span className="text-red-500 text-sm">Content is required</span>}
                </div>

                <button
                    type="submit"
                    className={`w-full py-3 text-white font-semibold rounded-lg transition-all duration-300 ${loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg"}`}
                    disabled={loading}
                >
                    {loading ? "Updating..." : "Save Changes"}
                </button>
            </form>

            <FloatingToolsMenu />
        </div>
    )
}
