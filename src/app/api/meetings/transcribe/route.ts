import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { config } from "@/lib/config";
import { requireAuth } from '@/lib/auth-utils';

const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY || '');

export async function POST(request: Request) {
    try {
        await requireAuth();
        const { recordingId } = await request.json();

        if (!recordingId) {
            return NextResponse.json({ error: 'Recording ID is required' }, { status: 400 });
        }

        const recording = await (prisma as any).meetingRecording.findUnique({
            where: { id: recordingId }
        });

        if (!recording || !recording.audioUrl) {
            return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
        }

        // 1. Fetch the audio file
        const audioResponse = await fetch(recording.audioUrl);
        const audioBuffer = await audioResponse.arrayBuffer();

        // 2. High-Fidelity Transcription (Raw)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const transcriptPrompt = `
            Please provide a verbatim transcription of this audio. 
            Deliver ONLY the raw transcript text. 
            Do not summarize, do not add headers, do not add introductory remarks.
            Just the raw spoken words, distinguishing between speakers if possible.
        `;

        const transcriptResult = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: Buffer.from(audioBuffer).toString("base64")
                }
            },
            { text: transcriptPrompt },
        ]);

        const rawTranscript = transcriptResult.response.text().trim();

        // 3. Store Raw Transcript Immediately
        await (prisma as any).meetingRecording.update({
            where: { id: recordingId },
            data: { transcriptText: rawTranscript }
        });

        // 4. Secondary Layer: Generate Summary/Action Items (Non-blocking conceptually, but in same route for simplicity here)
        const insightsPrompt = `
            Based on the following transcript, provide a concise summary and a list of key action items.
            Format as a JSON object: {"summary": "...", "actionItems": "..."}
            
            Transcript:
            ${rawTranscript}
        `;

        const insightsResult = await model.generateContent(insightsPrompt);
        const insightsJson = JSON.parse(insightsResult.response.text().replace(/```json|```/g, ''));

        await (prisma as any).meetingRecording.update({
            where: { id: recordingId },
            data: { 
                summary: insightsJson.summary || 'Summary generated.',
                actionItems: insightsJson.actionItems || 'No specific action items identified.'
            }
        });

        return NextResponse.json({ success: true, transcript: rawTranscript });
    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json({ error: 'Failed to transcribe' }, { status: 500 });
    }
}
