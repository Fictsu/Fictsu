"use client"

import Link from "next/link"
import Image from "next/image"
import { User } from "@/types/types"
import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"

export default function Navbar() {
    const router = useRouter()
    const pathname = usePathname()
    const dropdownRef = useRef<HTMLDivElement>(null)

    const [user, setUser] = useState<User | null>(null)
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const handleLoginClick = () => {
        const authWindow = window.open(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/auth/google`,
            "Login",
            "width=960, height=540"
        )

        const checkLogin = setInterval(() => {
            if (!authWindow || authWindow.closed) {
                clearInterval(checkLogin)
                window.location.reload()
            }
        }, 1000)
    }

    const handleLogout = async () => {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/auth/logout`, {
            credentials: "include",
        })

        setUser(null)
        router.push("/")
    }

    const handlePostClick = () => {
        if (user) {
            router.push("/f/create")
        } else {
            alert("You need to log in first to post your work!")
        }
    }

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/user`, {
            credentials: "include",
        })
            .then((res) => res.json())
            .then((data) => data.User_Profile && setUser(data.User_Profile))
            .catch((error) => console.error("Failed to fetch user: ", error))
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [])

    useEffect(() => {
        const handleLoginSuccess = (event: MessageEvent) => {
            if (event.origin === process.env.NEXT_PUBLIC_BACKEND_API && event.data === "login-success") {
                window.location.reload()
            }
        }

        window.addEventListener("message", handleLoginSuccess);
        return () => window.removeEventListener("message", handleLoginSuccess);
    }, [])

    return (
        <nav
            className={`flex items-center justify-between px-6 transition-all duration-300 shadow-lg ${
                user ? "py-2 bg-gray-800" : "py-4 bg-gray-900"
            } text-white`}
        >
            <Link href="/" className="text-2xl font-bold hover:text-gray-300 transition">
                FICTSU
            </Link>

            <div className="flex items-center space-x-4">
                {pathname !== "/f/create" && (
                    <button
                        aria-label="Post your work"
                        onClick={handlePostClick}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
                    >
                        Post your work +
                    </button>
                )}
                {user ? (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            aria-label="User menu"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition duration-300 hover:bg-gray-700"
                        >
                            <Image
                                src={user.avatar_url}
                                width={40}
                                height={40}
                                alt="User avatar"
                                referrerPolicy="no-referrer"
                                className="rounded-full border border-gray-600"
                            />
                            <span className="hidden sm:inline">{user.name}</span>
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white text-black shadow-lg rounded-lg overflow-hidden transition-all duration-300">
                                <button
                                    onClick={() => {
                                        setDropdownOpen(false)
                                        router.push("/user")
                                    }}
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 transition duration-200"
                                >
                                    Profile
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 transition duration-200"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={handleLoginClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                        aria-label="Login"
                    >
                        Login
                    </button>
                )}
            </div>
        </nav>
    )
}
