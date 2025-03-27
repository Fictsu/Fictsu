"use client"

import useSWR from "swr"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { User, Fiction } from "@/types/types"
import { useRouter, useSearchParams } from "next/navigation"

const fetcher = (URL: string) => fetch(URL, { credentials: "include" }).then((res) => res.json())

export default function UserProfilePage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [activeTab, setActiveTab] = useState<"favorites" | "contributions">("favorites")
    const { data, error, mutate } = useSWR(`${process.env.NEXT_PUBLIC_BACKEND_API}/user`, fetcher)

    useEffect(() => {
        if (error || (data && !data.User_Profile)) {
            alert("Please login to access your profile.")
            router.push("/")
        }
    }, [error, data, router])

    useEffect(() => {
        const tabParam = searchParams.get("tab") || "favorites"
        setActiveTab(tabParam as "favorites" | "contributions")
    }, [searchParams])

    if (!data || !data.User_Profile) {
        return <p className="text-center mt-10 text-lg">Redirecting...</p>
    }

    const user: User = data.User_Profile

    return (
        <div className="w-full max-w-3xl mx-auto p-4 bg-white shadow-sm rounded-lg mt-6 mb-6">
            <div className="flex items-center space-x-4">
                <Image
                    src={user.avatar_url}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full border-2 border-blue-500"
                    referrerPolicy="no-referrer"
                />
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">{user.name}</h1>
                    <p className="text-sm text-gray-600">{user.email}</p>
                </div>
            </div>

            <div className="mt-4 border-b flex justify-center space-x-4">
                <Link href="/user?tab=favorites">
                    <button
                        onClick={() => setActiveTab("favorites")}
                        className={`px-5 py-2 text-md font-semibold ${
                        activeTab === "favorites"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-500 hover:text-blue-600"
                        } transition-colors duration-300`}
                    >
                        Favorites
                    </button>
                </Link>
                <Link href="/user?tab=contributions">
                    <button
                        onClick={() => setActiveTab("contributions")}
                        className={`px-5 py-2 text-md font-semibold ${
                        activeTab === "contributions"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-500 hover:text-blue-600"
                        } transition-colors duration-300`}
                    >
                        Contributions
                    </button>
                </Link>
            </div>

            <div className="mt-4">
                {activeTab === "favorites" ? (
                    <FictionList fictions={user.fav_fictions} emptyMessage="No favorite fictions yet." />
                ) : (
                <FictionList
                    fictions={user.contributed_fic}
                    emptyMessage="No contributed fictions yet."
                    allowEdit={true}
                    mutate={mutate}
                    showCreated={true}
                />
                )}
            </div>
        </div>
    )
}

function FictionList({ fictions, emptyMessage, allowEdit, mutate, showCreated }: {
    fictions: Fiction[] | null | undefined,
    emptyMessage: string,
    allowEdit?: boolean,
    mutate?: () => void,
    showCreated?: boolean
}) {

    const [fictionList, setFictionList] = useState<Fiction[]>(fictions || [])

    useEffect(() => {
        setFictionList(fictions || [])
    }, [fictions])

    if (!fictionList || fictionList.length === 0) {
        return <p className="text-center text-gray-500">{emptyMessage}</p>
    }

    const handleEdit = (fiction_id: number) => {
        window.location.href = `/f/${fiction_id}/edit`
    }

    const handleDelete = async (fiction_id: number) => {
        if (!confirm("Are you sure you want to delete this fiction?")) {
            return
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fiction_id}/d`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error("Failed to delete fiction")
            }

            alert("Fiction deleted successfully")
            setFictionList((prev) => prev.filter((fic) => fic.id !== fiction_id))
            if (mutate) {
                await mutate()
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <ul className="space-y-4">
            {fictionList.map((fiction) => (
                <li key={fiction.id} className="flex items-center bg-gray-100 p-3 rounded-lg shadow-sm transition-all hover:shadow-md">
                    <Image
                        src={fiction.cover || "/default-cover.png"}
                        alt={fiction.title}
                        width={100}
                        height={120}
                        className="rounded-md object-cover"
                    />
                    <div className="ml-4 flex-1">
                        <Link href={`/f/${fiction.id}`}>
                            <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600">{fiction.title}</h3>
                        </Link>
                        <p className="text-sm text-gray-600">
                            {fiction.chapters?.length === 0 ? "No Chapter" : `${fiction.chapters?.length} Chapters`}
                        </p>
                        {showCreated && (
                            <p className="text-sm text-gray-500">Created: {new Date(fiction.created).toLocaleDateString()}</p>
                        )}
                    </div>

                    {allowEdit && (
                        <div className="flex flex-col items-end space-y-2">
                            <button
                                onClick={() => handleEdit(fiction.id)}
                                className="w-20 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-center"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(fiction.id)}
                                className="w-20 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 text-center"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    )
}
