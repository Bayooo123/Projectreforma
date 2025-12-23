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

// --- SEEDING HELPER (Statement of Claim) ---
// --- SEEDING HELPER (Statement of Claim) ---
export async function seedStatementOfClaimTemplate() {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    try {
        const existing = await prisma.draftingTemplate.findFirst({
            where: { name: "Statement of Claim (Partnership)" }
        });

        if (existing) return { success: true, id: existing.id, message: "Already exists" };

        const template = await prisma.draftingTemplate.create({
            data: {
                name: "Statement of Claim (Partnership)",
                category: "litigation",
                authorId: session.user.id!,
                isPublished: true,
                variables: {
                    create: [
                        { name: "claimant_name", label: "Claimant Name", type: "text" },
                        { name: "claimant_address", label: "Claimant Address", type: "text" },
                        { name: "defendant_name", label: "Defendant Name", type: "text" },
                        { name: "defendant_address", label: "Defendant Address", type: "text" },
                        { name: "partnership_start_date", label: "Partnership Start Date", type: "date" },
                        { name: "contract_sum", label: "Accrued Sum", type: "currency" }
                    ]
                },
                nodes: {
                    create: [
                        {
                            type: "QUESTION",
                            content: "Is the Claimant an individual or a registered company?",
                            helpText: "This determines the introductory averments regarding corporate status under CAMA.",
                            variableName: "claimant_type",
                            order: 1,
                            options: {
                                create: [
                                    { label: "Limited Liability Company", value: "company" },
                                    { label: "Individual / Sole Trader", value: "individual" }
                                ]
                            }
                        },
                        {
                            type: "QUESTION",
                            content: "What was the specific breach committed by the Defendant?",
                            helpText: "Identifying the breach is crucial for framing the cause of action.",
                            variableName: "breach_type",
                            order: 2,
                            options: {
                                create: [
                                    { label: "Conversion of Partnership Assets", value: "conversion" },
                                    { label: "Failure to Remit Proceeds", value: "non_remittance" },
                                    { label: "Both (Conversion & Non-Remittance)", value: "both" }
                                ]
                            }
                        },
                        {
                            type: "QUESTION",
                            content: "Have formal demand letters been served?",
                            helpText: "Proof of demand is often required to establish the cause of action and claim for interest.",
                            variableName: "demands_served",
                            order: 3,
                            options: {
                                create: [
                                    { label: "Yes, Letters Served", value: "yes" },
                                    { label: "No / Oral Demands only", value: "no" }
                                ]
                            }
                        },
                        {
                            type: "INFO",
                            content: "Procedural Note: Service Rules",
                            helpText: "At this stage (Statement of Claim), logic dictates Personal Service on the Defendant as no appearance has been entered yet.",
                            order: 4,
                            variableName: null
                        }
                    ]
                }
            }
        });

        return { success: true, id: template.id, message: "Statement of Claim Seeded" };

    } catch (error) {
        console.error("Seeding error:", error);
        return { success: false, error: String(error) };
    }
}
