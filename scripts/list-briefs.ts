import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.brief.findMany({
    where: { workspace: { slug: 'ascolp' }, status: 'active', deletedAt: null },
    select: { name: true, customTitle: true },
    orderBy: { name: 'asc' },
}).then(bs => {
    bs.forEach(b => console.log(b.customTitle || b.name));
    p.$disconnect();
});
