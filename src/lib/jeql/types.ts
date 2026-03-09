export type JEQLOperator = 
    | '=' | '!=' | '>' | '<' | '>=' | '<=' 
    | 'in' | 'not in' | 'like' | 'search' | 'json_contains'
    | 'date>' | 'date<' | 'date>=' | 'date<=' | 'date=' | 'date!=' | 'date_between';

export type JEQLCondition = 
    | [string | string[], JEQLOperator, any]
    | { $whereAll: JEQLCondition[] }
    | { $whereAny: JEQLCondition[] }
    | { $whereHas: Record<string, JEQLQuery> }
    | { $whereNotHas: Record<string, JEQLQuery> };

export type JEQLQuery = {
    $select?: string[];
    $with?: Record<string, JEQLQuery>;
    $whereAll?: JEQLCondition[];
    $whereAny?: JEQLCondition[];
    $whereHas?: Record<string, JEQLQuery>;
    $whereNotHas?: Record<string, JEQLQuery>;
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
