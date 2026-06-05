import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateBriefInput {
    briefNumber: string;
    name: string;
    clientId: string;
    lawyerId?: string;
    lawyerInChargeId?: string;
    workspaceId: string;
    category: string;
    status: string;
    dueDate?: Date | string | null;
    description?: string | null;
    parentBriefId?: string | null;
    isLitigationDerived?: boolean;
}

export interface UpdateBriefInput {
    name?: string;
    customTitle?: string | null;
    customBriefNumber?: string | null;
    clientId?: string;
    lawyerId?: string;
    lawyerInChargeId?: string;
    category?: string;
    status?: string;
    dueDate?: Date | null;
    description?: string;
}

const listInclude = {
    client: { select: { id: true, name: true, email: true } },
    lawyer: { select: { id: true, name: true, email: true } },
    lawyerInCharge: { select: { id: true, name: true, email: true } },
    matter: { select: { id: true, name: true, caseNumber: true } },
    _count: { select: { documents: true } },
} satisfies Prisma.BriefInclude;

export class BriefService {
    static async list(
        workspaceId: string,
        params?: {
            status?: string;
            lawyerId?: string;
            clientId?: string;
            category?: string;
            limit?: number;
            offset?: number;
        }
    ) {
        const where: Prisma.BriefWhereInput = {
            workspaceId,
            deletedAt: null,
        };
        if (params?.status) where.status = params.status;
        if (params?.lawyerId) where.lawyerId = params.lawyerId;
        if (params?.clientId) where.clientId = params.clientId;
        if (params?.category) where.category = params.category;

        const [briefs, total] = await Promise.all([
            prisma.brief.findMany({
                where,
                include: listInclude,
                orderBy: { updatedAt: 'desc' },
                take: params?.limit ?? 50,
                skip: params?.offset ?? 0,
            }),
            prisma.brief.count({ where }),
        ]);

        return { briefs, total };
    }

    static async getById(id: string, workspaceId?: string) {
        const where: Prisma.BriefWhereInput = workspaceId
            ? { id, workspaceId, deletedAt: null }
            : { id, deletedAt: null };

        return prisma.brief.findFirst({
            where,
            include: {
                client: {
                    select: { id: true, name: true, email: true, phone: true, company: true, status: true },
                },
                lawyer: { select: { id: true, name: true, email: true } },
                lawyerInCharge: { select: { id: true, name: true, email: true } },
                matter: {
                    select: { id: true, name: true, caseNumber: true, status: true, court: true, judge: true },
                },
                workspace: { select: { id: true, name: true } },
            },
        });
    }

    static async create(input: CreateBriefInput) {
        if (!input.briefNumber?.trim()) {
            return { success: false as const, error: 'Brief number is required' };
        }

        const result = await prisma.$transaction(
            async tx => {
                const existing = await tx.brief.findUnique({
                    where: { briefNumber: input.briefNumber },
                });
                if (existing) {
                    throw new Error(
                        `Brief number "${input.briefNumber}" already exists. Please use a different number.`
                    );
                }

                return tx.brief.create({
                    data: {
                        briefNumber: input.briefNumber,
                        name: input.name,
                        clientId: input.clientId,
                        lawyerId: input.lawyerId ?? '',
                        lawyerInChargeId: input.lawyerInChargeId ?? undefined,
                        workspaceId: input.workspaceId,
                        category: input.category,
                        status: input.status,
                        dueDate: input.dueDate ? new Date(input.dueDate) : null,
                        description: input.description ?? undefined,
                        isLitigationDerived: input.isLitigationDerived ?? false,
                        customTitle: undefined,
                        parentBriefId: input.parentBriefId ?? undefined,
                    },
                    include: {
                        client: true,
                        lawyer: { select: { id: true, name: true, email: true } },
                    },
                });
            },
            { maxWait: 5000, timeout: 10000 }
        );

        return { success: true as const, data: result };
    }

    static async update(id: string, patch: UpdateBriefInput) {
        const existing = await prisma.brief.findUnique({
            where: { id },
            select: { workspaceId: true, briefNumber: true, lawyerInChargeId: true },
        });
        if (!existing) return { success: false as const, error: 'Brief not found' };

        // Sanitize empty-string FK values
        if (patch.clientId === '') patch.clientId = undefined;
        if (patch.lawyerInChargeId === '') patch.lawyerInChargeId = undefined;
        if (patch.lawyerId === '') patch.lawyerId = undefined;

        const brief = await prisma.brief.update({
            where: { id },
            data: patch,
            include: {
                client: true,
                lawyer: { select: { id: true, name: true, email: true } },
                lawyerInCharge: { select: { id: true, name: true, email: true } },
            },
        });

        return { success: true as const, data: brief, workspaceId: existing.workspaceId };
    }

    static async softDelete(id: string, workspaceId: string) {
        const brief = await prisma.brief.findFirst({
            where: { id, workspaceId, deletedAt: null },
            select: { workspaceId: true, name: true },
        });
        if (!brief) return { success: false as const, error: 'Brief not found' };

        await prisma.brief.update({
            where: { id },
            data: { deletedAt: new Date(), status: 'archived' },
        });

        return { success: true as const };
    }

    static async assignLawyer(briefId: string, lawyerId: string) {
        const brief = await prisma.brief.update({
            where: { id: briefId },
            data: { lawyerId },
            include: {
                lawyer: { select: { id: true, name: true, email: true } },
                matter: { select: { id: true, name: true, caseNumber: true } },
            },
        });

        await prisma.notification.create({
            data: {
                type: 'info',
                title: 'New Brief Assignment',
                message: brief.matter
                    ? `You have been assigned brief "${brief.name}" (${brief.briefNumber}). This corresponds to matter "${brief.matter.name}" (${brief.matter.caseNumber}). Check the litigation tracker for the report on the case.`
                    : `You have been assigned brief "${brief.name}" (${brief.briefNumber}). Please review the brief details.`,
                recipientId: lawyerId,
                recipientType: 'lawyer',
                relatedBriefId: brief.id,
                relatedMatterId: brief.matterId,
                priority: 'medium',
                channels: JSON.stringify(['in-app']),
            },
        });

        return { success: true as const, data: brief };
    }
}
