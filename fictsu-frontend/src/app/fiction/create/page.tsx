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

function DataHandler(dataStr: any, DATA_TAG: any){
    const formData = new FormData()
    console.log(DATA_TAG.length)
    for(let i=0; i< DATA_TAG.length; i++){
        formData.append(DATA_TAG[i], dataStr[i])
    }
    return formData
}

export default function FictionCreatePage() {
    const router = useRouter()
    
    const [loading, setLoading] = useState(false)
    const [isCreated, setIsCreated] = useState(false)
    const [cover, setCover] = useState<File | null>(null)
    const [fiction, setFiction] = useState<Fiction | null>(null)
    const [previewURL, setPreviewURL] = useState<string>("/default-cover.png")

    const { register, handleSubmit, control, formState: { errors } } = useForm<FictionForm>()

    const onSubmit = async (data: FictionForm) => {
        if (loading || isCreated) {
            return
        }

        setLoading(true)
        try {
            const DATA_TAG = ["cover", "title", "subtitle", "status", "synopsis", "author", "artist"]
            var dataStr = [cover, data.title, data.subtitle, data.status, data.synopsis, data.author, data.artist]
            console.log(data.status)
            const formData = DataHandler(dataStr, DATA_TAG)
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/c`, {
                method: "POST",
                body: formData,
                credentials: "include",
            })

            if (response.ok) {
                const fictionData = await response.json()
                console.log(fictionData)
                setFiction(fictionData)
                setIsCreated(true)
                return
            } else {
                console.error("Failed to create fiction")
            }
        } catch (error) {
            console.error("Error submitting fiction form", error)
        } 

        setLoading(false)
    }

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        var file = e.target.files?.[0] || null
        if (file) {
            setPreviewURL(URL.createObjectURL(file))
            console.log(previewURL)
            setCover(file)
            }
    }
    return (
        <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10 mb-10 border border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Create Fiction</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex gap-7">
                    <div className="relative rounded-lg shadow-md cursor-pointer group">
                        <Image
                            src={previewURL}
                            alt="Fiction Cover"
                            width={230}
                            height={300}
                            className="rounded-lg object-cover"
                            unoptimized
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
                            isCreated
                                ? "bg-green-500 cursor-not-allowed"
                                : loading
                                ? "bg-blue-300 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 shadow-lg"
                        }`}
                        disabled={loading || isCreated}
                    >
                        {isCreated ? "Created!" : loading ? "Creating..." : "Create Fiction"}
                    </button>
                </div>
            </form>

            <div className="flex justify-center gap-4 mt-6">
                {fiction && (
                    <button
                        onClick={() => router.push(`/f/${fiction.id}`)}
                        className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 shadow-lg"
                    >
                        Go to Fiction
                    </button>
                )}
                {fiction && (
                    <button
                        onClick={() => router.push(`/f/${fiction.id}/ch/create`)}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-lg"
                    >
                        Create First Chapter!
                    </button>
                )}
            </div>

            <FloatingToolsMenu />
        </div>
    )
}
