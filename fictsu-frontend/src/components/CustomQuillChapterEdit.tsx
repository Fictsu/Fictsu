import dynamic from "next/dynamic"
import type { Quill } from "react-quill-new"
import "react-quill-new/dist/quill.snow.css"
import type ReactQuillType from "react-quill-new"
import React, { forwardRef, useRef, useImperativeHandle } from "react"

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false }) as typeof import("react-quill-new").default

export type CustomQuillHandle = {
    insertImage: (URL: string) => void
    getHTML: () => string
}

type CustomQuillProps = {
    value: string
    onChange: (value: string) => void
}

const CustomQuill = forwardRef<CustomQuillHandle, CustomQuillProps>(({ value, onChange }, ref) => {
    const editorRef = useRef<ReactQuillType | null>(null)

    useImperativeHandle(ref, () => ({
        insertImage: (URL: string) => {
            const cleanURL = URL.trim().replace(/^["']|["']$/g, "")
            const quill: Quill | undefined = editorRef.current?.getEditor()
            if (!quill) {
                return
            }

            let range = quill.getSelection()
            if (!range) {
                const length = quill.getLength()
                quill.focus()
                quill.setSelection(length, 0)
                range = { index: length, length: 0 }
            }

            quill.deleteText(range.index, range.length)
            quill.insertEmbed(range.index, "image", cleanURL, "user")
            quill.insertText(range.index + 1, "\n", "user")
            quill.setSelection(range.index + 2)
        },

        getHTML: () => {
            const quill: Quill | undefined = editorRef.current?.getEditor()
            return quill?.root?.innerHTML || ""
        }
    }))

    const toolbarOptions = [
        ["bold", "italic", "underline", "strike"],
        [{ size: ["small", false, "large", "huge"] }],
        [{ align: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"],
    ]

    return (
        <ReactQuill
            theme="snow"
            value={value}
            ref={editorRef}
            onChange={onChange}
            modules={{ toolbar: toolbarOptions }}
            placeholder="Write your content here..."
        />
    )
})

CustomQuill.displayName = "CustomQuill"

export default CustomQuill
