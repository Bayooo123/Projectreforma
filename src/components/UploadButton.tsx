'use client';

import type { PutBlobResult } from '@vercel/blob';
import { useState, useRef } from 'react';

export default function UploadButton() {
    const inputFileRef = useRef<HTMLInputElement>(null);
    const [blob, setBlob] = useState<PutBlobResult | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    return (
        <div className="flex flex-col gap-4 items-start">
            <h1 className="text-xl font-bold">Upload File</h1>

            <form
                onSubmit={async (event) => {
                    event.preventDefault();

                    if (!inputFileRef.current?.files) {
                        throw new Error("No file selected");
                    }

                    const file = inputFileRef.current.files[0];
                    setIsUploading(true);

                    try {
                        const response = await fetch(
                            `/api/upload?filename=${file.name}`,
                            {
                                method: 'POST',
                                body: file,
                            },
                        );

                        const newBlob = (await response.json()) as PutBlobResult;

                        setBlob(newBlob);
                    } catch (error) {
                        console.error('Upload failed:', error);
                        alert('Upload failed. Check console for details.');
                    } finally {
                        setIsUploading(false);
                    }
                }}
                className="flex flex-col gap-2"
            >
                <input name="file" ref={inputFileRef} type="file" required className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                <button type="submit" disabled={isUploading} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50">
                    {isUploading ? 'Uploading...' : 'Upload'}
                </button>
            </form>

            {blob && (
                <div className="mt-4 p-4 border rounded bg-gray-50">
                    <p className="font-semibold text-green-600">Upload Completed!</p>
                    <div className="mt-2">
                        <p className="text-sm text-gray-600">File URL:</p>
                        <a href={blob.url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline break-all">
                            {blob.url}
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
