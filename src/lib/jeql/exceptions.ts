export class JEQLException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'JEQLException';
    }
}

export class MissingRelationshipKeyException extends JEQLException {
    constructor(model: string, relation: string, missingKeys: string[]) {
        super(`To load the '${relation}' relationship on ${model}, you must include the following column(s) in your $select: ${missingKeys.map(k => `'${k}'`).join(', ')}`);
        this.name = 'MissingRelationshipKeyException';
    }
}

export class InvalidComparisonException extends JEQLException {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidComparisonException';
    }
}
