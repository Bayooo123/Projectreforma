import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  client: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  matter: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  task: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMocks,
}));

import { executeCrudPayload, CrudValidationError } from '../index';

describe('crud-engine', () => {
  const context = {
    platformEntity: { id: 'ws_123' },
    platformEntityType: 'biz',
    requestId: 'req_123',
  };

  beforeEach(() => {
    for (const delegate of Object.values(prismaMocks)) {
      for (const fn of Object.values(delegate)) {
        fn.mockReset();
      }
    }
  });

  it('fails immediately when a scope has no playbook', async () => {
    await expect(
      executeCrudPayload(
        [
          {
            action: 'read',
            parentEntityType: 'biz',
            parentEntityId: 'ws_123',
            data: {
              scope: 'invoice',
              targetOperations: {},
            },
          },
        ],
        context
      )
    ).rejects.toBeInstanceOf(CrudValidationError);
  });

  it('creates a client with injected workspace scope', async () => {
    prismaMocks.client.create.mockResolvedValue({ id: 'client_1', name: 'Acme' });

    const result = await executeCrudPayload(
      [
        {
          action: 'create',
          parentEntityType: 'biz',
          parentEntityId: 'ws_123',
          data: {
            relationName: 'client',
            definition: {
              name: 'Acme',
              email: 'acme@example.com',
            },
          },
        },
      ],
      context
    );

    expect(prismaMocks.client.create).toHaveBeenCalledWith({
      data: {
        name: 'Acme',
        email: 'acme@example.com',
        workspaceId: 'ws_123',
      },
    });
    expect(result[0]).toEqual({ created: true, record: { id: 'client_1', name: 'Acme' }, id: 'client_1' });
  });

  it('requires orderBy for updateEach', async () => {
    await expect(
      executeCrudPayload(
        [
          {
            action: 'updateEach',
            parentEntityType: 'biz',
            parentEntityId: 'ws_123',
            data: {
              scope: 'client',
              targetOperations: {
                $whereAll: [['status', '=', 'active']],
              },
              attributes: [{ status: 'inactive' }],
            },
          },
        ],
        context
      )
    ).rejects.toBeInstanceOf(CrudValidationError);
  });

  it('compiles create payloads for supported models', async () => {
    prismaMocks.matter.create.mockResolvedValue({ id: 'matter_1', name: 'Matter A' });

    const result = await executeCrudPayload(
      [
        {
          action: 'create',
          parentEntityType: 'biz',
          parentEntityId: 'ws_123',
          data: {
            relationName: 'matter',
            definition: {
              name: 'Matter A',
              status: 'active',
            },
          },
        },
      ],
      context
    );

    expect(prismaMocks.matter.create).toHaveBeenCalledWith({
      data: {
        name: 'Matter A',
        status: 'active',
        workspaceId: 'ws_123',
      },
    });
    expect(result[0].created).toBe(true);
  });
});
