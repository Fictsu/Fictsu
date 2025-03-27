import useSWR from "swr"
import { useState } from "react"
import { User } from "@/types/types"
import { motion } from "framer-motion"

const fetcher = async (URL: string) => {
    const res = await fetch(URL, { credentials: "include" })
    if (!res.ok) {
        throw new Error("Failed to fetch user data")
    }

    return res.json()
}

interface ChapterActionsProps {
    fictionID:      number
    chapterID:      number
    contributorID:  number
}

export default function ChapterActions({ fictionID, chapterID, contributorID }: ChapterActionsProps) {
    const [loading, setLoading] = useState(false)
    const { data } = useSWR(`${process.env.NEXT_PUBLIC_BACKEND_API}/user`, fetcher)

    const user: User | null = data?.User_Profile || null
    if (!user || user.id !== contributorID) {
        return null
    }

    const handleEdit = () => {
        // Open the edit page in a new tab
        window.open(`/f/${fictionID}/${chapterID}/edit`, "_blank")
    }

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this chapter?")) {
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/f/${fictionID}/${chapterID}/d`, {
                method: "DELETE",
                credentials: "include",
            })

            if (!res.ok) {
                throw new Error("Failed to delete chapter")
            }

            alert("Chapter deleted successfully")
            window.location.reload()
        } catch (error) {
            console.error("Error deleting chapter:", error)
            alert("An error occurred while deleting the chapter.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-3">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEdit}
                disabled={loading}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Edit
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {loading ? "Deleting..." : "Delete"}
            </motion.button>
        </div>
    )
}
