import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOjogbonUser } from '@/lib/ojogbon/server';

const MAX_PAPER_BYTES = 2_000_000;
const ID_RE = /^[A-Za-z0-9_-]{4,64}$/;

/** Prisma error when the OjogbonPaper table hasn't been migrated yet. */
function tableMissing(error: unknown) {
    const code = (error as { code?: string })?.code;
    return code === 'P2021' || code === 'P2022';
}

/** List the signed-in user's papers. */
export async function GET() {
    const who = await requireOjogbonUser();
    if (who instanceof NextResponse) return who;
    try {
        const rows = await prisma.ojogbonPaper.findMany({
            where: { userId: who.userId },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, data: true, updatedAt: true },
        });
        return NextResponse.json({ available: true, user: { id: who.userId, name: who.name }, papers: rows });
    } catch (error) {
        if (tableMissing(error)) {
            return NextResponse.json({ available: false, user: { id: who.userId, name: who.name }, papers: [] });
        }
        console.error('[ojogbon/papers] list failed', error);
        return NextResponse.json({ code: 'error', error: 'Couldn’t load your papers.' }, { status: 500 });
    }
}

/** Create or replace one paper. Body: { id, data }. */
export async function PUT(req: NextRequest) {
    const who = await requireOjogbonUser();
    if (who instanceof NextResponse) return who;

    const raw = await req.text();
    if (raw.length > MAX_PAPER_BYTES) {
        return NextResponse.json({ code: 'too_large', error: 'This paper is too large to save.' }, { status: 413 });
    }
    let body: { id?: unknown; data?: unknown };
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ code: 'bad_request', error: 'Invalid request.' }, { status: 400 });
    }
    const id = typeof body.id === 'string' ? body.id : '';
    const data = body.data as { topic?: unknown } | undefined;
    if (!ID_RE.test(id) || !data || typeof data !== 'object') {
        return NextResponse.json({ code: 'bad_request', error: 'Invalid paper.' }, { status: 400 });
    }
    const title = (typeof data.topic === 'string' ? data.topic : 'Untitled paper').slice(0, 300);

    try {
        const existing = await prisma.ojogbonPaper.findUnique({ where: { id }, select: { userId: true } });
        if (existing && existing.userId !== who.userId) {
            return NextResponse.json({ code: 'forbidden', error: 'Not your paper.' }, { status: 403 });
        }
        await prisma.ojogbonPaper.upsert({
            where: { id },
            create: { id, userId: who.userId, title, data: data as object },
            update: { title, data: data as object },
        });
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (tableMissing(error)) return NextResponse.json({ code: 'unavailable' }, { status: 503 });
        console.error('[ojogbon/papers] save failed', error);
        return NextResponse.json({ code: 'error', error: 'Couldn’t save.' }, { status: 500 });
    }
}

/** Delete one paper: DELETE /api/ojogbon/papers?id=… */
export async function DELETE(req: NextRequest) {
    const who = await requireOjogbonUser();
    if (who instanceof NextResponse) return who;
    const id = req.nextUrl.searchParams.get('id') ?? '';
    if (!ID_RE.test(id)) return NextResponse.json({ code: 'bad_request' }, { status: 400 });
    try {
        await prisma.ojogbonPaper.deleteMany({ where: { id, userId: who.userId } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (tableMissing(error)) return NextResponse.json({ code: 'unavailable' }, { status: 503 });
        return NextResponse.json({ code: 'error' }, { status: 500 });
    }
}
