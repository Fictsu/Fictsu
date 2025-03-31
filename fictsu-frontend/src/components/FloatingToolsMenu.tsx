import { marked } from "marked"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Menu, X, Bot, ImagePlus, ImageUp, ArrowUp } from "lucide-react"

export default function FloatingToolsMenu() {
    const pathname = usePathname()
    const chatContainerRef = useRef<HTMLDivElement>(null)

    const [loading, setLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [inputPrompt, setInputPrompt] = useState("")
    const [activeTool, setActiveTool] = useState<"menu" | "AI" | null>(null)
    const [messages, setMessages] = useState<{ text: string; sender: "user" | "AI" }[]>([])

    // Load messages from localStorage when component mounts
    useEffect(() => {
        const savedMessages = localStorage.getItem("chatHistory")
        if (savedMessages) {
            setMessages(JSON.parse(savedMessages))
        }
    }, [])

    // Save messages to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem("chatHistory", JSON.stringify(messages))
        }
    }, [messages])

    const toggleTool = (tool: "menu" | "AI") => {
        setActiveTool((prev) => (prev === tool ? null : tool))
    }

    const fetchAIResponse = async () => {
        if (!inputPrompt.trim()) {
            return
        }

        setIsSending(true)
        setLoading(true)

        setMessages((prevMessages) => [...prevMessages, { text: inputPrompt, sender: "user" }])
        setInputPrompt("")

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/ai/storyline/c`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ Message: inputPrompt }),
            })

            const data = await response.json()
            const AIResponse = response.ok ? data.Received_Message : `Error: ${data.Error}`

            setMessages((prevMessages) => [...prevMessages, { text: AIResponse, sender: "AI" }])
        } catch (error) {
            console.error("Error:", error)
            setMessages((prevMessages) => [...prevMessages, { text: "Failed to fetch AI response.", sender: "AI" }])
        }

        setLoading(false)

        // Scroll to the bottom after response is added
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }

        setIsSending(false)
    }

    const parseMarkdown = (markdownText: string) => {
        return marked(markdownText)
    }

    const isEditOrCreateFictionPage = /^\/f\/[^/]+\/edit$/.test(pathname) || pathname === "/f/create"

    return (
        <div className="fixed bottom-4 right-4 flex flex-col items-end z-50">
            <div className="relative">
                {activeTool === "menu" && (
                    <div className="absolute bottom-16 right-0 bg-white shadow-xl rounded-lg p-2 w-52 space-y-1 border text-black animate-fade-in">
                        <h2 className="text-lg font-semibold p-2">Tools</h2>
                        <MenuButton icon={<Bot size={20} />} label="AI Chat" onClick={() => toggleTool("AI")} />

                        {!isEditOrCreateFictionPage && (
                            <MenuButton icon={<ImageUp size={20} />} label="Upload Image" onClick={() => console.log("Upload Image")} />
                        )}

                        <MenuButton icon={<ImagePlus size={20} />} label="Generate Image" onClick={() => console.log("Generate Image")} />
                    </div>
                )}

                <button
                    onClick={() => toggleTool("menu")}
                    className="w-12 h-12 flex items-center justify-center bg-gray-500 text-white rounded-full shadow-lg transition-all hover:bg-gray-700 relative"
                >
                    <span className="absolute transition-opacity duration-200" style={{ opacity: activeTool === "menu" ? 0 : 1 }}>
                        <Menu size={24} />
                    </span>
                    <span className="absolute transition-opacity duration-200" style={{ opacity: activeTool === "menu" ? 1 : 0 }}>
                        <X size={24} />
                    </span>
                </button>
            </div>

            {activeTool === "AI" && (
                <div
                    className="absolute bottom-16 right-0 bg-white shadow-lg rounded-lg p-6 w-96 max-h-[85vh] flex flex-col border text-black overflow-hidden resize"
                    style={{
                        resize: "both",
                        overflow: "auto",
                        minWidth: "350px",
                        minHeight: "480px",
                        maxWidth: "1480px",
                        maxHeight: "87vh",
                        transformOrigin: "top left",
                    }}
                >
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">AI Assistant</h2>
                        <button onClick={() => toggleTool("AI")} className="text-gray-600 hover:text-gray-800">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Messages Container */}
                    <div ref={chatContainerRef} className="flex-1 overflow-auto mt-4 p-2 space-y-4">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex ${message.sender === "user" ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-lg max-w-[70%] break-words ${message.sender === "user" ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                                    dangerouslySetInnerHTML={{
                                        __html: parseMarkdown(message.text),
                                    }} />
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-center items-center">
                                <span className="text-blue-500">Loading...</span>
                            </div>
                        )}
                    </div>

                    {/* Text Input Area with Send Button */}
                    <div className="relative mt-4">
                        <textarea
                            className="w-full p-3 border rounded resize-none focus:outline-blue-500 min-h-[60px] bg-gray-100 pr-12"
                            placeholder="Type your message..."
                            value={inputPrompt}
                            onChange={(e) => setInputPrompt(e.target.value)}
                        />
                        <button
                            className={`absolute bottom-5.5 right-4.5 w-10 h-10 flex items-center justify-center ${inputPrompt.trim() && !isSending ? 'bg-blue-500' : 'bg-gray-300'} text-white rounded-full transition-all`}
                            onClick={fetchAIResponse}
                            disabled={!inputPrompt.trim() || isSending}
                        >
                            {isSending ? (
                                <span className="animate-spin">
                                    <ArrowUp size={20} />
                                </span>
                            ) : (
                                <ArrowUp size={20} />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function MenuButton({ icon, label, onClick }: { icon: React.JSX.Element; label: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="flex items-center w-full p-2 hover:bg-gray-100 rounded transition-all text-black">
            {icon}
            <span className="ml-2">{label}</span>
        </button>
    )
}
