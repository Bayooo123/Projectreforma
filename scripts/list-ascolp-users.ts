
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const workspaces = await prisma.workspace.findMany({
        where: {
            OR: [
                { slug: { contains: 'ascolp', mode: 'insensitive' } },
                { name: { contains: 'ascolp', mode: 'insensitive' } }
            ]
        },
        include: {
            members: {
                include: {
                    user: true
                }
            }
        }
    });

    if (workspaces.length === 0) {
        console.log('No workspace found matching "ascolp"');
        return;
    }

    const output = workspaces.map(w => ({
        workspace: w.name,
        slug: w.slug,
        members: w.members.map(m => ({
            name: m.user.name,
            email: m.user.email,
            role: m.role
        }))
    }));

    fs.writeFileSync(path.join(process.cwd(), 'ascolp_users.json'), JSON.stringify(output, null, 2));
    console.log('Successfully wrote to ascolp_users.json');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
