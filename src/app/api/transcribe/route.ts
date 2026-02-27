import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(request: Request) {
    try {
        await requireAuth();

        const { audioUrl } = await request.json();

        if (!audioUrl) {
            return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
        }

        // Fetch the audio file
        const audioResponse = await fetch(audioUrl);
        const audioBuffer = await audioResponse.arrayBuffer();

        // Use Gemini 1.5 Flash for transcription (supports audio)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: Buffer.from(audioBuffer).toString("base64")
                }
            },
            { text: "Please provide a verbatim transcription of this audio. If there are multiple speakers, try to distinguish them." },
        ]);

        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ transcription: text });
    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
    }
}
