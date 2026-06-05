import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateMatterInput {
    caseNumber?: string;
    name: string;
    clientId: string;
    userId: string;
    court?: string | null;
    judge?: string | null;
    description?: string | null;
    nextCourtDate?: Date | string | null;
    lawyerAssociations?: Array<{ lawyerId: string; role?: string; isAppearing?: boolean }>;
}

export interface UpdateMatterInput {
    name?: string;
    status?: string;
    court?: string | null;
    judge?: string | null;
    description?: string | null;
    nextCourtDate?: Date | null;
    lawyerAssociations?: Array<{ lawyerId: string; role?: string; isAppearing?: boolean }>;
}

export class MatterService {
    static async list(
        workspaceId: string,
        params?: {
            status?: string;
            clientId?: string;
            lawyerId?: string;
            limit?: number;
            offset?: number;
        }
    ) {
        const where: Prisma.MatterWhereInput = { workspaceId, deletedAt: null };
        if (params?.status) where.status = params.status;
        if (params?.clientId) where.clientId = params.clientId;
        if (params?.lawyerId) where.lawyers = { some: { lawyerId: params.lawyerId } };

        const [matters, total] = await Promise.all([
            prisma.matter.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true, email: true } },
                    lawyers: {
                        include: { lawyer: { select: { id: true, name: true, email: true } } },
                    },
                },
                orderBy: { nextCourtDate: 'asc' },
                take: params?.limit ?? 50,
                skip: params?.offset ?? 0,
            }),
            prisma.matter.count({ where }),
        ]);

        return { matters, total };
    }

    static async getById(id: string, workspaceId?: string) {
        const where: Prisma.MatterWhereInput = workspaceId
            ? { id, workspaceId, deletedAt: null }
            : { id, deletedAt: null };

        return prisma.matter.findFirst({
            where,
            include: {
                client: { select: { id: true, name: true, email: true } },
                lawyers: {
                    include: { lawyer: { select: { id: true, name: true, email: true } } },
                },
                briefs: {
                    select: { id: true, briefNumber: true, name: true, status: true, category: true },
                },
            },
        });
    }

    /**
     * Creates a matter with lawyer associations and always initializes milestones.
     * Used by API routes where the client is explicitly provided.
     */
    static async createBasic(workspaceId: string, input: CreateMatterInput) {
        const matter = await prisma.matter.create({
            data: {
                caseNumber: input.caseNumber ?? null,
                name: input.name,
                clientId: input.clientId,
                lawyerInChargeId: input.userId,
                lawyers: {
                    create: input.lawyerAssociations?.length
                        ? input.lawyerAssociations.map(a => ({
                              lawyerId: a.lawyerId,
                              role: a.role ?? 'Lead Counsel',
                              isAppearing: a.isAppearing ?? true,
                          }))
                        : [{ lawyerId: input.userId, role: 'Lead Counsel', isAppearing: true }],
                },
                court: input.court ?? null,
                judge: input.judge ?? null,
                nextCourtDate: input.nextCourtDate ? new Date(input.nextCourtDate) : null,
                status: 'active',
                workspaceId,
            },
            include: {
                client: { select: { id: true, name: true } },
                lawyers: {
                    include: { lawyer: { select: { id: true, name: true } } },
                },
            },
        });

        // Always initialize milestones regardless of creation path
        const { initializeMilestonesForMatter } = await import('@/app/actions/litigation-milestones');
        initializeMilestonesForMatter(matter.id, workspaceId).catch(() => {});

        return { success: true as const, data: matter };
    }

    static async update(id: string, patch: UpdateMatterInput) {
        const existing = await prisma.matter.findUnique({
            where: { id },
            select: { workspaceId: true },
        });
        if (!existing) return { success: false as const, error: 'Matter not found' };

        const { lawyerAssociations, ...fields } = patch;

        const updateData: Prisma.MatterUpdateInput = {
            ...fields,
            nextCourtDate: fields.nextCourtDate ?? undefined,
        };

        if (lawyerAssociations !== undefined) {
            updateData.lawyers = {
                deleteMany: {},
                create: lawyerAssociations.map(a => ({
                    lawyerId: a.lawyerId,
                    role: a.role ?? 'Counsel',
                    isAppearing: a.isAppearing ?? false,
                })),
            };
        }

        const matter = await prisma.matter.update({
            where: { id },
            data: updateData,
            include: {
                client: { select: { id: true, name: true } },
                lawyers: {
                    include: { lawyer: { select: { id: true, name: true } } },
                },
            },
        });

        return { success: true as const, data: matter, workspaceId: existing.workspaceId };
    }

    static async softDelete(id: string, workspaceId: string) {
        const matter = await prisma.matter.findFirst({
            where: { id, workspaceId, deletedAt: null },
            select: { name: true },
        });
        if (!matter) return { success: false as const, error: 'Matter not found' };

        await prisma.matter.update({ where: { id }, data: { deletedAt: new Date() } });
        return { success: true as const };
    }
}
