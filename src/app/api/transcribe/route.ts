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

        // Use Gemini 1.5 Flash for transcription and analysis
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `
            Please provide a verbatim transcription of this audio. 
            Also, provide a concise summary of the meeting and a list of key action items.
            Format the response as a JSON object with the following structure:
            {
                "transcription": "Verbatim text here...",
                "summary": "Concise summary here...",
                "actionItems": "List of action items as a string or markdown list..."
            }
            If there are multiple speakers, try to distinguish them in the transcription.
        `;

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: Buffer.from(audioBuffer).toString("base64")
                }
            },
            { text: prompt },
        ]);

        const response = await result.response;
        const resultText = response.text();

        // Parse the JSON response
        const parsedData = JSON.parse(resultText);

        return NextResponse.json(parsedData);
    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
    }
}
