
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface LiveEditorProps {
    content: string;
    isStreaming?: boolean;
}

export function LiveEditor({ content, isStreaming }: LiveEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Your legal draft will appear here...',
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none focus:outline-none min-h-[600px] p-8',
            },
        },
        editable: !isStreaming, // Lock while streaming (optional)
    });

    // Update content when "stream" comes in
    useEffect(() => {
        if (editor && content && content !== editor.getHTML()) {
            // Only update if significantly different to avoid cursor jumps
            // For simple streaming, we might just setContent. 
            // Better UX: Insert at cursor. For now, simple replace for V1.
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[calc(100vh-12rem)] overflow-hidden">
            {/* Toolbar (Simplified for V1) */}
            <div className="border-b border-slate-100 p-2 flex gap-2 bg-slate-50/50">
                <div className="text-xs text-slate-400 font-medium px-2 py-1">Mode: Formatting Enabled</div>
            </div>

            {/* Editor Area */}
            <EditorContent editor={editor} />
        </div>
    );
}
