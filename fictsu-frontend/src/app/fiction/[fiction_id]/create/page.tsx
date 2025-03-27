"use client"

import useSWR from "swr"
import dynamic from "next/dynamic"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { ChapterForm } from "@/types/types"
import { useState, useEffect } from "react"
import "react-quill-new/dist/quill.snow.css"
import FloatingToolsMenu from "@/components/FloatingToolsMenu"

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })
const fetcher = (URL: string) => fetch(URL, { credentials: "include" }).then(res => res.json())

export default function ChapterCreatePage({ params }: { params: Promise<{ fiction_id: string }> }) {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [editorContent, setEditorContent] = useState("")
    const [fictionID, setFictionID] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<ChapterForm>()

    useEffect(() => {
        params.then(({ fiction_id }) => setFictionID(fiction_id))
    }, [params])

    const { data: userData, error: userError } = useSWR(fictionID ? `${process.env.NEXT_PUBLIC_BACKEND_API}/user` : null, fetcher)
    const { data: fictionData, error: fictionError } = useSWR(fictionID ? `${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fictionID}` : null, fetcher)

    useEffect(() => {
        if (!fictionID) {
            return
        }

        if (userError || fictionError) {
            setErrorMessage("Failed to load data. Redirecting...")
            setTimeout(() => router.push("/user"), 2500)
            return
        }

        if (!userData || !fictionData?.Fiction) {
            return
        }

        const userID = userData.User_Profile?.id
        const contributorID = fictionData.Fiction.contributor_id
        if (!userID) {
            setErrorMessage("You must be logged in. Redirecting...")
            setTimeout(() => router.push("/"), 2500)
            return
        }

        if (userID !== contributorID) {
            setErrorMessage("You are not the contributor. Redirecting...")
            setTimeout(() => router.push("/"), 2500)
        }
    }, [fictionID, userData, fictionData, userError, fictionError, router])

    const onSubmit = async (formData: ChapterForm) => {
        if (!fictionID) {
            return
        }

        setLoading(true)
        setErrorMessage(null)
    
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fictionID}/c`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            })
    
            if (!response.ok) {
                throw new Error("Failed to create chapter.")
            }
    
            const newChapter = await response.json()
            alert("Chapter created successfully!")
            router.push(`/fiction/${fictionID}/${newChapter.id}`)
        } catch (error) {
            // Check if error is an instance of Error, otherwise use a fallback message
            if (error instanceof Error) {
                setErrorMessage(error.message)
            } else {
                setErrorMessage("An unknown error occurred.")
            }
        } finally {
            setLoading(false)
        }
    }    

    if (!fictionID || !userData || !fictionData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <p className="text-gray-700 text-lg font-medium animate-pulse">Loading...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10 border border-gray-200 mb-10">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Create Chapter</h1>

            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-md mb-6 text-center">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <div>
                    <label className="block text-gray-800 font-medium mb-2">Title</label>
                    <input 
                        {...register("title", { required: "Title is required" })} 
                        placeholder="Enter chapter title"
                        className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 outline-none transition-all duration-200 text-gray-900"
                        disabled={loading}
                    />
                    {errors.title && <span className="text-red-500 text-sm">{errors.title.message}</span>}
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
                    className={`w-full py-3 text-white font-semibold rounded-lg transition-all duration-300 ${
                        loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg"
                    }`}
                    disabled={loading}
                >
                    {loading ? "Creating..." : "Create Chapter"}
                </button>
            </form>

            <FloatingToolsMenu />
        </div>
    )
}
