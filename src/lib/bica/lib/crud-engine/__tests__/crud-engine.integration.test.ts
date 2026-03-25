import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { executeCrudPayload } from '../index';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const maybeDescribe = hasDatabase ? describe : describe.skip;

async function createTempWorkspace() {
  const userEmail = `crud-engine-${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: userEmail,
      name: 'Crud Engine Owner',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `Crud Engine Workspace ${randomUUID()}`,
      slug: `crud-engine-${randomUUID()}`,
      ownerId: user.id,
    },
  });

  return { user, workspace };
}

maybeDescribe('crud-engine integration', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a real client record through the CRUD engine', async () => {
    const { user, workspace } = await createTempWorkspace();
    const email = `client-${randomUUID()}@example.com`;

    try {
      const result = await executeCrudPayload(
        [
          {
            action: 'create',
            parentEntityType: 'workspace',
            parentEntityId: workspace.id,
            data: {
              relationName: 'client',
              definition: {
                name: 'Integration Client',
                email,
                status: 'active',
              },
            },
          },
        ],
        {
          platformEntity: workspace,
          platformEntityType: 'workspace',
          requestId: randomUUID(),
        }
      );

      const persisted = await prisma.client.findUnique({ where: { email } });

      expect(result[0].created).toBe(true);
      expect(result[0].id).toBeTruthy();
      expect(persisted).not.toBeNull();
      expect(persisted?.workspaceId).toBe(workspace.id);
      expect(persisted?.name).toBe('Integration Client');
    } finally {
      await prisma.client.deleteMany({ where: { email } });
      await prisma.workspace.delete({ where: { id: workspace.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it('reads a real client record back from the database', async () => {
    const { user, workspace } = await createTempWorkspace();
    const email = `client-read-${randomUUID()}@example.com`;

    try {
      const created = await prisma.client.create({
        data: {
          name: 'Readback Client',
          email,
          status: 'active',
          workspaceId: workspace.id,
        },
      });

      const result = await executeCrudPayload(
        [
          {
            action: 'read',
            parentEntityType: 'workspace',
            parentEntityId: workspace.id,
            data: {
              scope: 'client',
              targetOperations: {
                $select: ['id', 'name', 'email'],
                $whereAll: [['email', '=', email]],
                $orderBy: [['createdAt', 'desc']],
              },
            },
          },
        ],
        {
          platformEntity: workspace,
          platformEntityType: 'workspace',
          requestId: randomUUID(),
        }
      );

      expect(result[0].records).toHaveLength(1);
      expect(result[0].records[0]).toMatchObject({
        id: created.id,
        name: 'Readback Client',
        email,
      });
    } finally {
      await prisma.client.deleteMany({ where: { email } });
      await prisma.workspace.delete({ where: { id: workspace.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});