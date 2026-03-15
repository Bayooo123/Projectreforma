export type JEQLOperator =
    | '=' | '!=' | '>' | '<' | '>=' | '<='
    | 'in' | 'not in' | 'like' | 'search' | 'json_contains'
    | 'date>' | 'date<' | 'date>=' | 'date<=' | 'date=' | 'date!=' | 'date_between';

export type JEQLCondition =
    | [string | string[], JEQLOperator, any]
    | { $whereAll: JEQLCondition[] }
    | { $whereAny: JEQLCondition[] };

/**
 * JEQL Query object.
 *
 * $whereHas / $whereNotHas accept an array of tuples:
 *   [relationName: string, conditions: JEQLCondition[]][]
 *
 * This mirrors the Bica Crud spec which sends them as:
 *   "$whereHas": [["items", [["is_gift", "=", true]]]]
 */
export type JEQLQuery = {
    $select?: string[];
    $with?: Record<string, JEQLQuery>;
    $whereAll?: JEQLCondition[];
    $whereAny?: JEQLCondition[];
    /** Array of [relationName, conditions] tuples */
    $whereHas?: [string, JEQLCondition[]][];
    $whereNotHas?: [string, JEQLCondition[]][];
    $orderBy?: [string, 'asc' | 'desc'][];
    $limit?: number;
    $offset?: number;
    $withSemanticMatches?: string | string[] | Record<string, string>;
};

export interface PrismaQueryArgs {
    select?: any;
    include?: any;
    where?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
}
