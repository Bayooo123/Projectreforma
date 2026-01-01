import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/matters/:id/adjourn
 * Adjourn a matter to a new date
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const matter = await prisma.matter.findFirst({
            where: {
                id: params.id,
                workspaceId: auth!.workspaceId,
            },
        });

        if (!matter) {
            return notFoundResponse('Matter');
        }

        const body = await request.json();
        const { newDate, newTime, reason } = body;

        if (!newDate) {
            return errorResponse('VALIDATION_ERROR', 'New date is required', 400, 'newDate');
        }

        const oldDate = matter.nextCourtDate;
        const newDateTime = new Date(`${newDate}T${newTime || '09:00'}:00`);

        // Update the matter
        const updatedMatter = await prisma.matter.update({
            where: { id: params.id },
            data: {
                nextCourtDate: newDateTime,
            },
            include: {
                client: { select: { id: true, name: true } },
                assignedLawyer: { select: { id: true, name: true } },
            },
        });

        // Log the adjournment
        await prisma.matterActivityLog.create({
            data: {
                matterId: matter.id,
                action: `Matter adjourned via API from ${oldDate?.toISOString().split('T')[0] || 'N/A'} to ${newDate}${reason ? `. Reason: ${reason}` : ''}`,
                performedById: auth!.userId,
            },
        });

        return successResponse({
            ...updatedMatter,
            adjournment: {
                previousDate: oldDate,
                newDate: newDateTime,
                reason: reason || null,
            },
        });

    } catch (err) {
        console.error('Error adjourning matter:', err);
        return errorResponse('SERVER_ERROR', 'Failed to adjourn matter', 500);
    }
}
