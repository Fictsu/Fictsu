"use client"

import useSWR from "swr"
import { useState } from "react"
import { Heart, HeartOff } from "lucide-react"

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" })
        .then((res) => {
            if (res.status === 401) {
                return { is_favorited: false, is_logged_in: false } // Handle not logged in
            }

            if (!res.ok) {
                throw new Error("Failed to fetch data")
            }
            return res.json()
        })

export default function FavoriteButton({ fictionID }: { fictionID: number }) {
    const { data, error, mutate } = useSWR(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fictionID}/fav/status`,
        fetcher
    )

    const [loading, setLoading] = useState(false)

    async function toggleFavorite() {
        if (!data) {
            return
        }

        if (data.is_logged_in === false) {
            alert("You need to log in to favorite a fiction.")
            return
        }

        setLoading(true)
        try {
            const method = data.is_favorited ? "DELETE" : "POST"
            const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fictionID}/fav${data.is_favorited ? "/rmv" : ""}`

            const res = await fetch(endpoint, {
                method,
                credentials: "include",
            })

            if (res.status === 401) {
                alert("You need to log in to favorite a fiction.")
                return
            }

            if (!res.ok) {
                throw new Error(`Failed to ${data.is_favorited ? "remove" : "add"} favorite`)
            }

            await mutate({ ...data, is_favorited: !data.is_favorited }, false)
        } catch (error) {
            console.error("Error toggling favorite:", error)
        } finally {
            setLoading(false)
        }
    }

    if (error) {
        return null
    }

    return (
        <button
            disabled={loading}
            onClick={toggleFavorite}
            className={`p-2 rounded-lg transition ${
                data?.is_favorited ? "text-red-500 hover:text-red-700" : "text-gray-500 hover:text-gray-700"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label={data?.is_favorited ? "Remove from favorites" : "Add to favorites"}
        >
            {data?.is_favorited ? <Heart className="w-10 h-10 fill-current" /> : <HeartOff className="w-10 h-10" />}
        </button>
    )
}
