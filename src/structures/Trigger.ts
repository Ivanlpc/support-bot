import { SQLEvents } from "../events/V2/types";
const MySQLEvents = require('@rodrigogs/mysql-events').STATEMENTS;


export default class Trigger<Key extends keyof SQLEvents> {
    
    name : Key;
    expression: string;
    statement: typeof MySQLEvents;
    public onEvent: (...args: SQLEvents[Key]) => void;

    constructor(name: Key, expression: string, statement: typeof MySQLEvents, onEvent: (...args: SQLEvents[Key]) => void) {
        this.name = name;
        this.expression = expression;
        this.statement = statement;
        this.onEvent = onEvent;
    }

}