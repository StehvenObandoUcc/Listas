import { PurchaseRequest, ProcessState, Role, ProductItem } from '../models/Purchase.js';

export class PurchaseService {
    private requestsList: PurchaseRequest[] = [];
    private nextId: number = 1;

    createRequisition(creatorName: string): PurchaseRequest {
        const req = new PurchaseRequest(this.nextId++, creatorName);
        req.addLog('Shipping Officer', 'Prepared requisition');
        this.requestsList.push(req);
        return req;
    }

    findById(id: number): PurchaseRequest | undefined {
        return this.requestsList.find(req => req.id === id);
    }

    getAll(): PurchaseRequest[] {
        return this.requestsList;
    }

    deleteRequest(id: number): boolean {
        const index = this.requestsList.findIndex(req => req.id === id);
        if (index !== -1) {
            this.requestsList.splice(index, 1);
            return true;
        }
        return false;
    }

    updateRequest(id: number, buyer: string, product: string, qty: number, price: number): boolean {
        const req = this.findById(id);
        if (!req) return false;
        req.creatorName = buyer;
        if (req.items.length > 0) {
            req.items[0].name = product;
            req.items[0].quantity = qty;
            req.items[0].price = price;
        } else {
            req.items.push(new ProductItem(1, product, qty, price));
        }
        req.addLog('Shipping Officer', 'Requisition Updated');
        return true;
    }

    addCustomNote(id: number, role: Role, note: string): boolean {
        const req = this.findById(id);
        if (!req) return false;
        req.addLog(role, 'Custom Note Adding', note);
        return true;
    }

    reorderRequests(sourceId: number, targetId: number): boolean {
        const sourceIndex = this.requestsList.findIndex(r => r.id === sourceId);
        const targetIndex = this.requestsList.findIndex(r => r.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return false;

        const [removed] = this.requestsList.splice(sourceIndex, 1);
        this.requestsList.splice(targetIndex, 0, removed);
        return true;
    }

    prepareRFQ(id: number, needsReview: boolean): boolean {
        const req = this.findById(id);
        if (!req) return false;

        req.status = needsReview ? 'EVALUATION' : 'SUPERVISOR_REVIEW';
        req.addLog('Buyer Agent', `Prepared RFQ. Needs review: ${needsReview}`);
        return true;
    }

    evaluateQuote(id: number, isApproved: boolean, reason: string = ""): boolean {
        const req = this.findById(id);
        if (!req) return false;

        if (isApproved) {
            req.status = 'SUPERVISOR_REVIEW';
            req.addLog('Buyer Agent', 'Evaluated and Approved Quote Request');
        } else {
            req.status = 'REQUISITION';
            req.rejectionReason = reason;
            req.addLog('Buyer Agent', 'Rejected Quote Request (Returned)', reason);
        }
        return true;
    }

    supervisorReview(id: number, decideToQuote: boolean, reason: string = ""): boolean {
        const req = this.findById(id);
        if (!req) return false;

        if (decideToQuote) {
            req.status = 'QUOTE_PREPARATION';
            req.addLog('Supervisor', 'Decided to Quote -> Passed to Seller');
        } else {
            req.status = 'REJECTED';
            req.rejectionReason = reason;
            req.addLog('Supervisor', 'Process Terminated', reason);
        }
        return true;
    }

    sellerQuoteReview(id: number, isAcceptable: boolean, reason: string = ""): boolean {
        const req = this.findById(id);
        if (!req) return false;

        if (isAcceptable) {
            req.status = 'ORDER_PREPARATION';
            req.addLog('Seller', 'Quote Acceptable. Order Preparation started');
            req.tasks = [
                "Validar inventarios (disponibilidad)",
                "Confirmar tiempos y entrega",
                "Coordinar logística y almacenaje",
                "Preparar listado de empaque y documentos"
            ];
        } else {
            req.status = 'REJECTED';
            req.addLog('Seller', 'Quote Not Acceptable.', reason);
        }
        return true;
    }

    reviewAndFulfill(id: number, isAcceptable: boolean, reason: string = ""): boolean {
        const req = this.findById(id);
        if (!req) return false;

        if (isAcceptable) {
            req.status = 'FULFILLED';
            req.addLog('Receiving Agent', 'Order Acceptable. Fulfilling Order.');
            req.tasks = [
                "Fulfill order (Ejecución y entrega)",
                "Prepare order invoice (Emisión de factura)",
                "Receive payment from customer & Close"
            ];
        } else {
            req.status = 'EVALUATION';
            req.addLog('Receiving Agent', 'Returned to negotiation.', reason);
        }
        return true;
    }
}
