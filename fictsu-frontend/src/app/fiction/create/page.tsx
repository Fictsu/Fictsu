"use client"

import Image from "next/image"
import { useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import "react-quill-new/dist/quill.snow.css"
import { Fiction, FictionForm } from "@/types/types"
import { useForm, Controller } from "react-hook-form"
import FloatingToolsMenu from "@/components/FloatingToolsMenu"

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

export default function FictionCreatePage() {
    const router = useRouter()
    
    const [loading, setLoading] = useState(false)
    const [cover, setCover] = useState("/default-cover.png")
    const [fiction, setFiction] = useState<Fiction | null>(null)

    const { register: registerFiction, handleSubmit: handleFictionSubmit, control: controlFiction, formState: { errors } } = useForm<FictionForm>()

    const onSubmit = async (data: FictionForm) => {
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

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10 mb-10 border border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Create Fiction</h1>

            <form onSubmit={handleFictionSubmit(onSubmit)} className="space-y-6">
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
                        <div className="space-y-1">
                            <input
                                {...registerFiction("title", { required: "Title is required" })}
                                placeholder={errors.title ? errors.title.message : "Title"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.title ? "text-red-500 border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

                        <input
                            {...registerFiction("subtitle")}
                            placeholder="Subtitle"
                            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />

                        <div className="space-y-1">
                            <input
                                {...registerFiction("author", { required: "Author is required" })}
                                placeholder={errors.author ? errors.author.message : "Author"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.author ? "text-red-500 border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

                        <div className="space-y-1">
                            <input
                                {...registerFiction("artist", { required: "Artist is required" })}
                                placeholder={errors.artist ? errors.artist.message : "Artist *If no artsis, type N/A"}
                                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 ${errors.artist ? "text-red-500 border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"} text-gray-900`}
                            />
                        </div>

                        <select
                            {...registerFiction("status")}
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
                            control={controlFiction}
                            rules={{
                                required: "Synopsis is required",
                                validate: value => value.replace(/<(.|\n)*?>/g, '').trim() !== "" || "Synopsis is required"
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
                        {loading ? "Creating..." : "Create Fiction"}
                    </button>
                </div>
            </form>

            {fiction && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push(`/f/${fiction.id}/ch/create`)}
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 shadow-lg"
                    >
                        Create First Chapter!
                    </button>
                </div>
            )}

            <FloatingToolsMenu />
        </div>
    )
}
