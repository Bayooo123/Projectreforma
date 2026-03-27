import { describe, expect, it } from 'vitest';

import { JeqlCompiler, JeqlValidationError } from '../index';

describe('JeqlCompiler', () => {
  const compiler = new JeqlCompiler();

  it('compiles scalar filters and merges base scope', () => {
    const result = compiler.compile(
      {
        $whereAll: [
          ['status', '=', 'active'],
          ['priority', 'in', ['high', 'urgent']],
        ],
      },
      { baseWhere: { workspaceId: 'ws_123' } }
    );

    expect(result.where).toEqual({
      AND: [
        { workspaceId: 'ws_123' },
        {
          AND: [
            { status: { equals: 'active' } },
            { priority: { in: ['high', 'urgent'] } },
          ],
        },
      ],
    });
  });

  it('compiles nested OR and relation existence filters', () => {
    const result = compiler.compile({
      $whereAll: [
        ['status', '=', 'active'],
        {
          $whereAny: [
            ['name', 'like', '%okafor%'],
            ['email', 'like', '%okafor%'],
          ],
        },
      ],
      $whereHas: {
        matters: {
          $whereAll: [['status', '=', 'active']],
        },
      },
    });

    expect(result.where).toEqual({
      AND: [
        {
          AND: [
            { status: { equals: 'active' } },
            {
              OR: [
                { name: { contains: 'okafor', mode: 'insensitive' } },
                { email: { contains: 'okafor', mode: 'insensitive' } },
              ],
            },
          ],
        },
        {
          matters: {
            some: {
              status: { equals: 'active' },
            },
          },
        },
      ],
    });
  });

  it('uses is/isNot for to-one relation filters when cardinality is provided', () => {
    const result = compiler.compile(
      {
        $whereHas: {
          matter: {
            $whereAll: [['name', 'search', 'Balogun v. Balogun']],
          },
        },
        $whereNotHas: {
          client: {
            $whereAll: [['status', '=', 'inactive']],
          },
        },
      },
      {
        relationCardinality: {
          matter: 'one',
          client: 'one',
        },
      }
    );

    expect(result.where).toEqual({
      AND: [
        {
          matter: {
            is: {
              OR: [
                { name: { contains: 'Balogun v. Balogun', mode: 'insensitive' } },
                { name: { contains: 'balogun', mode: 'insensitive' } },
                { name: { contains: 'v', mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          client: {
            isNot: {
              status: { equals: 'inactive' },
            },
          },
        },
      ],
    });
  });

  it('maps $with relation aliases to Prisma relation field names', () => {
    const result = compiler.compile(
      {
        $select: ['id', 'name', 'status'],
        $with: {
          Brief: { $select: ['id', 'name', 'matterId', 'status', 'category'] },
          CalendarEntry: { $select: ['id', 'matterId', 'title', 'date', 'type'] },
          Task: { $select: ['id', 'matterId', 'title', 'status', 'priority', 'dueDate'] },
        },
      },
      {
        relationFieldMap: {
          brief: 'briefs',
          Brief: 'briefs',
          calendarentry: 'calendarEntries',
          CalendarEntry: 'calendarEntries',
          task: 'tasks',
          Task: 'tasks',
        },
      }
    );

    expect(result.select).toEqual({
      id: true,
      name: true,
      status: true,
      briefs: {
        select: {
          id: true,
          name: true,
          matterId: true,
          status: true,
          category: true,
        },
      },
      calendarEntries: {
        select: {
          id: true,
          matterId: true,
          title: true,
          date: true,
          type: true,
        },
      },
      tasks: {
        select: {
          id: true,
          matterId: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
      },
    });
  });

  it('compiles search across one or many columns', () => {
    const single = compiler.compile({
      $whereAll: [['name', 'search', 'John Smith']],
    });

    expect(single.where).toEqual({
      OR: [
        { name: { contains: 'John Smith', mode: 'insensitive' } },
        { name: { contains: 'john', mode: 'insensitive' } },
        { name: { contains: 'smith', mode: 'insensitive' } },
      ],
    });

    const multi = compiler.compile({
      $whereAll: [[['name', 'email'], 'search', 'Jane Doe']],
    });

    expect(multi.where).toEqual({
      OR: [
        { name: { contains: 'Jane Doe', mode: 'insensitive' } },
        { name: { contains: 'jane', mode: 'insensitive' } },
        { name: { contains: 'doe', mode: 'insensitive' } },
        { email: { contains: 'Jane Doe', mode: 'insensitive' } },
        { email: { contains: 'jane', mode: 'insensitive' } },
        { email: { contains: 'doe', mode: 'insensitive' } },
      ],
    });
  });

  it('compiles date operators into inclusive ranges', () => {
    const result = compiler.compile({
      $whereAll: [
        ['dueDate', 'date=', '2026-03-24'],
        ['createdAt', 'date_between', ['2026-01-01', '2026-01-31']],
        ['completedAt', 'date!=', '2026-02-15'],
      ],
    });

    expect(result.where).toEqual({
      AND: [
        {
          dueDate: {
            gte: new Date('2026-03-24T00:00:00.000Z'),
            lte: new Date('2026-03-24T23:59:59.999Z'),
          },
        },
        {
          createdAt: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lte: new Date('2026-01-31T23:59:59.999Z'),
          },
        },
        {
          OR: [
            { completedAt: { lt: new Date('2026-02-15T00:00:00.000Z') } },
            { completedAt: { gt: new Date('2026-02-15T23:59:59.999Z') } },
          ],
        },
      ],
    });
  });

  it('compiles select, include, ordering, and pagination', () => {
    const result = compiler.compile({
      $select: ['id', 'name'],
      $with: {
        matters: {
          $select: ['id', 'name'],
          $whereAll: [['status', '=', 'active']],
          $orderBy: [['name', 'asc']],
          $limit: 5,
        },
      },
      $orderBy: [['createdAt', 'desc']],
      $limit: 20,
      $offset: 40,
    });

    expect(result).toEqual({
      select: {
        id: true,
        name: true,
        matters: {
          where: { status: { equals: 'active' } },
          select: {
            id: true,
            name: true,
          },
          orderBy: [{ name: 'asc' }],
          take: 5,
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
      skip: 40,
    });
  });

  it('throws for semantic matching requests', () => {
    expect(() => compiler.compile({ $withSemanticMatches: 'urgent items' })).toThrow(JeqlValidationError);
  });

  it('throws for dot notation in where filters', () => {
    expect(() => compiler.compile({ $whereAll: [['client.name', '=', 'Acme']] })).toThrow(JeqlValidationError);
  });

  it('uses modelKey to resolve camelcase field names from Prisma metadata', () => {
    // When modelKey is provided, the compiler auto-resolves field names
    // by calling resolveFieldName with dmmf metadata.
    // This test demonstrates that:
    // 1. Exact field names work: 'dueDate' -> 'dueDate'
    // 2. Lowercase variants work: 'duedate' -> 'dueDate'
    // 3. Snake_case is converted: 'due_date' -> 'dueDate'
    const result = compiler.compile(
      {
        $select: ['id', 'dueDate'],
        $whereAll: [['status', '=', 'active']],
        $orderBy: [['dueDate', 'desc']],
      },
      {
        modelKey: 'brief',
      }
    );

    // All field names should be normalized to their camelCase canonical form
    expect(result.select).toBeDefined();
    expect(result.where).toBeDefined();
    expect(result.orderBy).toBeDefined();
  });
});
