export type Role = 'Shipping Officer' | 'Buyer Agent' | 'Supervisor' | 'Seller' | 'Receiving Agent';

export type ProcessState =
    | 'REQUISITION'
    | 'EVALUATION'
    | 'SUPERVISOR_REVIEW'
    | 'QUOTE_PREPARATION'
    | 'ORDER_PREPARATION'
    | 'FULFILLED'
    | 'REJECTED';

export class ActionLog {
    constructor(
        public date: Date,
        public role: Role,
        public action: string,
        public notes: string = ""
    ) { }
}

export class ProductItem {
    constructor(public id: number, public name: string, public quantity: number, public price: number) { }
}

export class PurchaseRequest {
    public items: ProductItem[] = [];
    public history: ActionLog[] = [];
    public tasks: string[] = [];

    public status: ProcessState = 'REQUISITION';
    public rejectionReason: string = "";

    constructor(
        public id: number,
        public creatorName: string,
        public date: Date = new Date()
    ) { }

    getTotal(): number {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    addLog(role: Role, action: string, notes: string = "") {
        this.history.push(new ActionLog(new Date(), role, action, notes));
    }
}
