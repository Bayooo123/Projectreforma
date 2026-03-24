const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('--- VERIFYING MODELS ---');
    const meetingCount = await prisma.meetingRecording.count();
    console.log('MeetingRecording count:', meetingCount);

    const auditCount = await prisma.expenseAuditLog.count();
    console.log('ExpenseAuditLog count:', auditCount);

    const deletionLogs = await prisma.expenseAuditLog.findMany({
      where: { action: 'DELETE' },
      include: { user: true }
    });
    console.log('Deletion logs found:', deletionLogs.length);
    if (deletionLogs.length > 0) {
      console.log('Last deletion log oldData:', JSON.stringify(deletionLogs[0].oldData, null, 2));
    }

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
