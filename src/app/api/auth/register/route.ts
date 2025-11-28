import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, name, firmName } = body;

        // Validation
        if (!email || !password || !name || !firmName) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters long" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create workspace slug from firm name
        const slug = firmName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Check if workspace slug already exists
        const existingWorkspace = await prisma.workspace.findUnique({
            where: { slug },
        });

        if (existingWorkspace) {
            return NextResponse.json(
                { error: "A workspace with this name already exists" },
                { status: 400 }
            );
        }

        // Create user and workspace in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    isActive: true,
                },
            });

            // Create workspace
            const workspace = await tx.workspace.create({
                data: {
                    name: firmName,
                    slug,
                    ownerId: user.id,
                    plan: "free",
                },
            });

            // Create workspace membership
            await tx.workspaceMember.create({
                data: {
                    workspaceId: workspace.id,
                    userId: user.id,
                    role: "owner",
                },
            });

            return { user, workspace };
        });

        return NextResponse.json(
            {
                message: "Registration successful",
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                },
                workspace: {
                    id: result.workspace.id,
                    name: result.workspace.name,
                    slug: result.workspace.slug,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "An error occurred during registration" },
            { status: 500 }
        );
    }
}
