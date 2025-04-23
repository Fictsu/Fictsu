"use client"

import useSWR from "swr"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { ChapterForm } from "@/types/types"
import "react-quill-new/dist/quill.snow.css"
import { useForm, Controller } from "react-hook-form"
import { use, useRef, useState, useEffect } from "react"
import FloatingToolsMenu from "@/components/FloatingToolsMenu"
import type { CustomQuillHandle } from "@/components/CustomQuillChapterEdit"

const CustomQuill = dynamic(() => import("@/components/CustomQuillChapterEdit"), { ssr: false })
const fetcher = (URL: string) => fetch(URL, { credentials: "include" }).then((res) => res.json())

export default function ChapterEditPage({ params }: { params: Promise<{ fiction_id: string; chapter_id: string }> }) {
    const router = useRouter()
    const quillRef = useRef<CustomQuillHandle>(null)

    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const { fiction_id, chapter_id } = use(params)
    const { data: userData, error: userError } = useSWR(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/user`, fetcher
    )
    const { data: fictionData, error: fictionError } = useSWR(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}`, fetcher
    )
    const { data: chapterData, error: chapterError, mutate } = useSWR(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}/${chapter_id}`, fetcher
    )
    const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<ChapterForm>()

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
        mutate()
        router.push(`/f/${fiction_id}/${chapter_id}`)
    }

    useEffect(() => {
        if (chapterData?.title) {
            setValue("title", chapterData.title)
        }

        if (chapterData?.content) {
            setValue("content", chapterData.content)
        }
    }, [chapterData, setValue])

    useEffect(() => {
        const redirectWithMessage = (message: string, path: string) => {
            setErrorMessage(message)
            setTimeout(() => router.push(path), 2500)
        }

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
    }, [userData, fictionData, chapterData, router, userError, fictionError, chapterError])

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10 border border-gray-200 mb-10">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Edit Chapter</h1>

            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-md mb-6 text-center">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <div className="space-y-2">
                    <label className={`block font-medium ${errors.title ? "text-red-500" : "text-gray-700"}`}>
                        {errors.title ? errors.title.message : "Title"}
                    </label>

                    <input
                        {...register("title", { required: "Title is required" })}
                        placeholder={errors.title ? errors.title.message : "Title"}
                        className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${
                            errors.title
                            ? "text-gray-900 border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        } text-gray-900`}
                    />
                </div>

                <div className="space-y-2">
                    <label className={`block font-medium ${errors.content ? "text-red-500" : "text-gray-700"}`}>
                        {errors.content ? errors.content.message : "Content"}
                    </label>

                    <div className={`border rounded-lg p-2 ${errors.content ? "border-red-500" : "border-gray-300"} text-gray-900`}>
                        <Controller
                            name="content"
                            control={control}
                            rules={{
                                required: "Content is required",
                                validate: (value) => {
                                    const hasText = value?.replace(/<[^>]+>/g, "").trim().length > 0
                                    const hasImage = /<img\s+[^>]*src=/.test(value)
                                    return hasText || hasImage || "Content is required"
                                },
                            }}
                            render={({ field }) => (
                                <CustomQuill
                                    ref={quillRef}
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                />
                            )}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className={`w-full py-3 text-white font-semibold rounded-lg transition-all duration-300 ${loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-lg"}`}
                    disabled={loading}
                >
                    {loading ? "Updating..." : "Save Changes"}
                </button>
            </form>

            <FloatingToolsMenu
                onImageInsert={(url) => {
                    quillRef.current?.insertImage(url)
                    const newContent = quillRef.current?.getHTML()
                    if (newContent) {
                        setValue("content", newContent, { shouldValidate: true })
                    }
                }}
            />
        </div>
    )
}
