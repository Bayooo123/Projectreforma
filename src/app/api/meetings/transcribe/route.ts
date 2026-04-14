import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { config } from "@/lib/config";
import { requireAuth } from '@/lib/auth-utils';

const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY || '');

export async function POST(request: Request) {
    let recordingId: string | undefined;
    try {
        await requireAuth();
        const body = await request.json();
        recordingId = body.recordingId;

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

        // 4. Secondary Layer: Generate Summary/Action Items
        const insightsPrompt = `
            Based on the following transcript, provide a concise summary and a list of key action items.
            Format as a JSON object: {"summary": "...", "actionItems": "..."}
            
            Transcript:
            ${rawTranscript}
        `;

        try {
            const insightsResult = await model.generateContent(insightsPrompt);
            const insightsText = insightsResult.response.text().replace(/```json|```/g, '').trim();
            const insightsJson = JSON.parse(insightsText);

            await (prisma as any).meetingRecording.update({
                where: { id: recordingId },
                data: { 
                    summary: insightsJson.summary || 'Summary generated.',
                    actionItems: insightsJson.actionItems || 'No specific action items identified.'
                }
            });
        } catch (insightsError) {
            console.error('Insights generation error:', insightsError);
            // Fallback for insights but don't fail the whole request since transcript is ready
            await (prisma as any).meetingRecording.update({
                where: { id: recordingId },
                data: { 
                    summary: 'Partial summary: ' + rawTranscript.substring(0, 100) + '...',
                    actionItems: 'Failed to generate specific action items.'
                }
            });
        }

        return NextResponse.json({ success: true, transcript: rawTranscript });
    } catch (error: any) {
        console.error('Transcription error:', error);
        
        // Update status to failed so UI stops polling/shows error
        if (recordingId) {
            try {
                await (prisma as any).meetingRecording.update({
                    where: { id: recordingId },
                    data: { 
                        transcriptText: 'FAILED',
                        summary: 'Transcription failed. Please check your audio file or try again.'
                    }
                });
            } catch (pError) {
                console.error('Failed to update recording status to FAILED:', pError);
            }
        }
        
        return NextResponse.json({ error: 'Failed to transcribe: ' + error.message }, { status: 500 });
    }
}
