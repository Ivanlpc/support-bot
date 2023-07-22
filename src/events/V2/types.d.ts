interface IEvent<T> {
    type: types,
    schema: string,
    table: string,
    affectedRows: T
    affectedColumns: Array<string>
    timestamp: number,
    nextPosition: number
    binlogName: string

}

export interface SQLEvents {
    DeleteAction: [IEvent<Array<{ after: undefined, before: IAction }>>]
    Unban: [IEvent<Array<{ after: ILitebansBans, before: ILitebansBans }>>]
    Unmute: [IEvent<Array<{ after: ILitebansBans, before: ILitebansBans }>>]
    NewRank: [IEvent<Array<{ after: IRank, before: undefined }>>]
    DeleteHistory: [IEvent<Array<{after: undefined, before: ILitebansBans}>>]
}

interface IRank {
    id: number,
    uuid: string,
    permission: string,
    value: boolean,
    server: string,
    world: string,
    expiry: number,
    context: string
}

interface ILitebansBans {
    id: number,
    uuid: string,
    ip: string,
    reason: string,
    banned_by_uuid: string,
    banned_by_name: string,
    removed_by_uuid: string,
    removed_by_name: string,
    removed_by_reason: string,
    removed_by_date: string,
    time: number,
    until: number,
    template: number,
    server_scope: string,
    server_origin: string,
    silent: boolean,
    ipban: boolean
}
interface IAction {
    id: string,
    time: string,
    actor_uuid: string,
    actor_name: string,
    type: string,
    acted_uuid: string,
    acted_name: string,
    action: string
}

enum types {
    UPDATE = 'UPDATE',
    INSERT = 'INSERT',
    DELETE = 'DELETE'
}