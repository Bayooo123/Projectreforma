
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'bayo@abiolasanniandco.com';
    const emailUpper = 'BAYO@ABIOLASANNIANDCO.COM';

    console.log(`Testing case sensitivity for email: ${email}`);

    const exactMatch = await prisma.user.findUnique({
        where: { email: email }
    });
    console.log(`Exact match found: ${!!exactMatch}`);

    const upperMatch = await prisma.user.findUnique({
        where: { email: emailUpper }
    });
    console.log(`Uppercase match found: ${!!upperMatch}`);

    if (!!exactMatch !== !!upperMatch) {
        console.log('RESULT: Database lookup is CASE SENSITIVE.');
    } else {
        console.log('RESULT: Database lookup is CASE INSENSITIVE (or both exist).');
    }

    await prisma.$disconnect();
}

main();
