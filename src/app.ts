import { PurchaseService } from './services/PurchaseService.js';
import { ProductItem } from './models/Purchase.js';

const service = new PurchaseService();
const getEl = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

document.addEventListener("DOMContentLoaded", () => {
    getEl('btn-submit-req')?.addEventListener('click', () => {
        const buyer = (getEl('req-buyer') as HTMLInputElement).value;
        const product = (getEl('req-product') as HTMLInputElement).value;
        const qty = parseInt((getEl('req-qty') as HTMLInputElement).value);
        const price = parseFloat((getEl('req-price') as HTMLInputElement).value);

        if (!buyer || !product || isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
            alert("Por favor completa todos los campos correctamente.");
            return;
        }

        const req = service.createRequisition(buyer);
        req.items.push(new ProductItem(1, product, qty, price));

        (getEl('req-buyer') as HTMLInputElement).value = "";
        (getEl('req-product') as HTMLInputElement).value = "";
        (getEl('req-qty') as HTMLInputElement).value = "";
        (getEl('req-price') as HTMLInputElement).value = "";

        renderDashboard();
    });
});

function renderDashboard() {
    const container = getEl('dashboard');
    if (!container) return;

    const requests = [...service.getAll()];

    container.innerHTML = requests.map(req => {
        let buttons = '';
        switch (req.status) {
            case 'REQUISITION':
                buttons = `<button onclick="processFlow(${req.id}, 'RFQ', false)">RFQ: Direct to Supervisor</button>`; break;
            case 'EVALUATION':
                buttons = `<button onclick="processFlow(${req.id}, 'EVAL', true)">Approve Quote</button>
                           <button class="reject" onclick="promptReject(${req.id}, 'EVAL')">Reject to Requisition</button>`; break;
            case 'SUPERVISOR_REVIEW':
                buttons = `<button onclick="processFlow(${req.id}, 'SUP', true)">Decide to Quote</button>
                           <button class="reject" onclick="promptReject(${req.id}, 'SUP')">Terminate (Reject)</button>`; break;
            case 'QUOTE_PREPARATION':
                buttons = `<button onclick="processFlow(${req.id}, 'SELL', true)">Quote Acceptable</button>
                           <button class="reject" onclick="promptReject(${req.id}, 'SELL')">Quote Unacceptable</button>`; break;
            case 'ORDER_PREPARATION':
                buttons = `<button onclick="processFlow(${req.id}, 'RCV', true)">Order Acceptable (Fulfill)</button>
                           <button class="reject" onclick="promptReject(${req.id}, 'RCV')">Reject to Evaluation</button>`; break;
        }

        const tasksHtml = req.tasks.length > 0
            ? `<div class="tasks"><strong>Checklist:</strong><ul>${req.tasks.map(t => `<li>✅ ${t}</li>`).join('')}</ul></div>` : '';

        const historyHtml = `<div class="history"><strong>Log:</strong><ul>${req.history.map(h =>
            `<li>[${h.role}] ${h.action} <span class="note">${h.notes}</span></li>`).join('')}</ul></div>`;

        return `
        <div class="card status-${req.status.toLowerCase()}" 
             draggable="true" 
             ondragstart="handleDragStart(event, ${req.id})" 
             ondragover="handleDragOver(event)" 
             ondrop="handleDrop(event, ${req.id})"
             ondragend="handleDragEnd(event)">
            <div class="card-header">
                <div>
                    <h3 style="margin-bottom: 5px;">Req #${req.id} <span style="font-size: 0.9rem; font-weight: normal; color: #555;">- ${req.items.length ? req.items[0].name : 'Sin Items'}</span></h3>
                    <span class="badge ${req.status}">${req.status}</span>
                </div>
                <div style="display:flex; gap: 8px;">
                    <button onclick="editRequest(${req.id})" title="Modificar Orden" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✏️</button>
                    <button onclick="addNote(${req.id})" title="Añadir Nota" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">📝</button>
                    <button onclick="deleteRequest(${req.id})" title="Eliminar Pedido" style="background:none; border:none; cursor:pointer; font-size:1.2rem; color:red;">🗑️</button>
                </div>
            </div>
            <p style="margin-top: 5px;"><strong>Comprador:</strong> ${req.creatorName} | <strong>Cant:</strong> ${req.items.length ? req.items[0].quantity : 0} | <strong>Total:</strong> $${req.getTotal()}</p>
            ${tasksHtml}
            ${historyHtml}
            <div class="actions">${buttons}</div>
        </div>`;
    }).join('');
}

(window as any).processFlow = (id: number, step: string, choice: boolean, reason: string = "") => {
    if (step === 'RFQ') service.prepareRFQ(id, choice);
    if (step === 'EVAL') service.evaluateQuote(id, choice, reason);
    if (step === 'SUP') service.supervisorReview(id, choice, reason);
    if (step === 'SELL') service.sellerQuoteReview(id, choice, reason);
    if (step === 'RCV') service.reviewAndFulfill(id, choice, reason);
    renderDashboard();
};

(window as any).promptReject = (id: number, step: string) => {
    const reason = prompt("Ingresa el motivo del rechazo (Proceso documental):");
    if (reason) (window as any).processFlow(id, step, false, reason);
};

(window as any).deleteRequest = (id: number) => {
    if (confirm("¿Seguro que deseas eliminar este pedido por completo?")) {
        service.deleteRequest(id);
        renderDashboard();
    }
};

(window as any).editRequest = (id: number) => {
    const req = service.findById(id);
    if (!req) return;

    const newBuyer = prompt("Modificar Comprador/Cliente:", req.creatorName);
    if (newBuyer === null) return;

    const prod = req.items[0];
    const newProduct = prompt("Modificar Producto:", prod ? prod.name : "");
    if (newProduct === null) return;

    const newQtyStr = prompt("Modificar Cantidad:", prod ? prod.quantity.toString() : "1");
    if (newQtyStr === null) return;

    const newPriceStr = prompt("Modificar Precio Unitario:", prod ? prod.price.toString() : "0");
    if (newPriceStr === null) return;

    const qty = parseInt(newQtyStr);
    const price = parseFloat(newPriceStr);

    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
        service.updateRequest(id, newBuyer, newProduct, qty, price);
        renderDashboard();
    } else {
        alert("Cantidad o precio inválidos. Deben ser mayores a 0.");
    }
};

(window as any).addNote = (id: number) => {
    const note = prompt("Escribe tu nota u observación de la cotización/orden:");
    if (note) {
        service.addCustomNote(id, 'Shipping Officer', note);
        renderDashboard();
    }
};

let draggedId: number | null = null;

(window as any).handleDragStart = (e: DragEvent, id: number) => {
    draggedId = id;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id.toString());
    }
    setTimeout(() => {
        (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
};

(window as any).handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
};

(window as any).handleDrop = (e: DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId !== null && draggedId !== targetId) {
        service.reorderRequests(draggedId, targetId);
        renderDashboard();
    }
};

(window as any).handleDragEnd = (e: DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    draggedId = null;
};
