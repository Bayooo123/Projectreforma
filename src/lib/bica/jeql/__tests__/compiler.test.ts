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
});