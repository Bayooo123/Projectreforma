'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- TEMPLATE ACTIONS ---

export async function getTemplate(templateId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        const template = await prisma.draftingTemplate.findUnique({
            where: { id: templateId },
            include: {
                nodes: {
                    include: {
                        options: true
                    },
                    orderBy: {
                        order: 'asc'
                    }
                },
                variables: true
            }
        });

        if (!template) return { success: false, error: "Template not found" };

        return { success: true, data: template };
    } catch (error) {
        console.error("Error fetching template:", error);
        return { success: false, error: "Failed to fetch template" };
    }
}

export async function getTemplateByName(name: string) {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        const template = await prisma.draftingTemplate.findFirst({
            where: { name },
            include: {
                nodes: {
                    include: {
                        options: true
                    },
                    orderBy: {
                        order: 'asc'
                    }
                },
                variables: true
            }
        });

        if (!template) return { success: false, error: "Template not found" };
        return { success: true, data: template };
    } catch (error) {
        console.error("Error fetching template:", error);
        return { success: false, error: "Failed to fetch template" };
    }
}

// --- SESSION ACTIONS ---

export async function startDraftingSession(templateId: string, briefId?: string) {
    const session = await auth();
    const user = session?.user;
    if (!user || !user.id) return { success: false, error: "Unauthorized" };

    try {
        // 1. Create the session
        const newSession = await prisma.draftingSession.create({
            data: {
                templateId,
                userId: user.id,
                status: 'in_progress',
                // We could link briefId here if we added a relation, specifically dealing with context
            }
        });

        return { success: true, sessionId: newSession.id };
    } catch (error) {
        console.error("Error starting session:", error);
        return { success: false, error: "Failed to start session" };
    }
}

export async function saveDraftingResponse(sessionId: string, nodeId: string, value: string) {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        // Upsert the response (update if exists, create if not)
        await prisma.draftingResponse.upsert({
            where: {
                sessionId_nodeId: {
                    sessionId,
                    nodeId
                }
            },
            update: { value },
            create: {
                sessionId,
                nodeId,
                value
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error saving response:", error);
        return { success: false, error: "Failed to save response" };
    }
}

// --- SEEDING HELPER (TEMPORARY) ---
// This allows us to inject the 'Lagos Tenancy' logical structure into the DB
export async function seedLagosTenancyTemplate() {
    const session = await auth();
    // In production, restrict this to admins
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        // Check if exists
        const existing = await prisma.draftingTemplate.findFirst({
            where: { name: "Lagos Tenancy Agreement" }
        });

        if (existing) return { success: true, id: existing.id, message: "Already exists" };

        // Create Template
        const template = await prisma.draftingTemplate.create({
            data: {
                name: "Lagos Tenancy Agreement",
                category: "contracts",
                authorId: session.user.id!,
                isPublished: true,
                nodes: {
                    create: [
                        {
                            type: "QUESTION",
                            content: "Is this tenancy for a residential or commercial property?",
                            helpText: "The Tenancy Law of Lagos State 2011 has specific exemptions for certain commercial premises.",
                            variableName: "property_type",
                            order: 1,
                            options: {
                                create: [
                                    { label: "Residential Premises", value: "residential" },
                                    { label: "Commercial Premises", value: "commercial" }
                                ]
                            }
                        },
                        {
                            type: "QUESTION",
                            content: "What is the duration of the tenancy?",
                            helpText: "Tenancies over 3 years require a deed and specific registration.",
                            variableName: "duration_type",
                            order: 2,
                            options: {
                                create: [
                                    { label: "One Year (Standard)", value: "1_year" },
                                    { label: "Two Years", value: "2_years" },
                                    { label: "Long Lease (>3 Years)", value: "long_lease" }
                                ]
                            }
                        },
                        {
                            type: "QUESTION",
                            content: "Who is responsible for external repairs?",
                            helpText: "Standard practice is Landlord, but full repairing leases shift this to the Tenant.",
                            variableName: "repairs",
                            order: 3,
                            options: {
                                create: [
                                    { label: "Landlord (Standard)", value: "landlord" },
                                    { label: "Tenant (Full Repairing)", value: "tenant" }
                                ]
                            }
                        }
                    ]
                }
            }
        });

        return { success: true, id: template.id, message: "Template Seeded" };

    } catch (error) {
        console.error("Seeding error:", error);
        return { success: false, error: String(error) };
    }
}
