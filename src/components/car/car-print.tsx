import { format } from "date-fns";

import {
  computeOrderEconomics,
  vehicleLabel,
  type OrderRecord,
} from "@/lib/car/operations";

/**
 * Printable paperwork. A rental business hands the customer a document at
 * pick-up and another at settlement, so both are rendered as a self-contained
 * A4 sheet and pushed through the browser's print dialog.
 */

type PrintLabels = Record<string, string>;

const escapeHtml = (value: unknown): string =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);

const dateTime = (value: unknown): string => {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : format(date, "d MMM yyyy HH:mm");
};

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; margin: 0; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
  section { margin-bottom: 22px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 5px 0; vertical-align: top; }
  td.label { color: #666; width: 38%; }
  td.value { font-weight: 500; }
  table.lines td { border-bottom: 1px solid #eee; padding: 7px 0; }
  table.lines td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { border-bottom: none; border-top: 2px solid #111; font-weight: 700; font-size: 15px; padding-top: 10px; }
  .signatures { display: flex; gap: 48px; margin-top: 48px; font-size: 12px; color: #666; }
  .signatures div { flex: 1; border-top: 1px solid #999; padding-top: 6px; }
  .note { font-size: 11px; color: #888; margin-top: 18px; }
  @page { size: A4; margin: 16mm; }
`;

function printDocument(title: string, body: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    return;
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
      title
    )}</title><style>${PRINT_STYLES}</style></head><body>${body}</body></html>`
  );
  doc.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 500);
  };
  frame.contentWindow?.addEventListener("afterprint", cleanup);
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  window.setTimeout(cleanup, 60_000);
}

const row = (label: string, value: unknown) =>
  `<tr><td class="label">${escapeHtml(label)}</td><td class="value">${escapeHtml(
    value
  )}</td></tr>`;

/** Rental agreement handed over with the keys. */
export function printRentalAgreement(order: OrderRecord, labels: PrintLabels) {
  const economics = computeOrderEconomics(order);
  const body = `
    <h1>${escapeHtml(labels.title)}</h1>
    <div class="meta">${escapeHtml(order.order_no ?? `#${order.id}`)} · ${escapeHtml(
      labels.printedAt
    )} ${escapeHtml(format(new Date(), "d MMM yyyy HH:mm"))}</div>

    <section>
      <h2>${escapeHtml(labels.customer)}</h2>
      <table>
        ${row(labels.customerName, order.customer?.name)}
        ${row(labels.phone, order.customer?.phone)}
        ${row(labels.creditLevel, order.customer?.credit_level)}
        ${row(labels.licenceExpiry, order.customer?.license_expiry)}
      </table>
    </section>

    <section>
      <h2>${escapeHtml(labels.vehicle)}</h2>
      <table>
        ${row(labels.plate, order.vehicle?.plate_number)}
        ${row(labels.model, [order.vehicle?.brand, order.vehicle?.model].filter(Boolean).join(" "))}
        ${row(labels.color, order.vehicle?.color)}
        ${row(labels.odometer, order.vehicle?.mileage)}
      </table>
    </section>

    <section>
      <h2>${escapeHtml(labels.rental)}</h2>
      <table>
        ${row(labels.pickup, dateTime(order.pickup_time))}
        ${row(labels.expectedReturn, dateTime(order.expected_return))}
        ${row(labels.days, economics.plannedDays)}
        ${row(labels.dailyRate, money(economics.dailyRate))}
        ${row(labels.total, money(economics.baseAmount))}
        ${row(labels.deposit, money(economics.depositHeld))}
      </table>
    </section>

    <section>
      <h2>${escapeHtml(labels.terms)}</h2>
      <p style="font-size:12px;color:#444;line-height:1.6;margin:0">${escapeHtml(
        labels.termsBody
      )}</p>
    </section>

    <div class="signatures">
      <div>${escapeHtml(labels.customerSignature)}</div>
      <div>${escapeHtml(labels.staffSignature)}</div>
    </div>
  `;
  printDocument(labels.title, body);
}

/** Settlement receipt produced at check-in. */
export function printSettlement(order: OrderRecord, labels: PrintLabels) {
  const economics = computeOrderEconomics(order);
  const lines = [
    [
      `${labels.rentalLine} (${economics.plannedDays} × ${money(economics.dailyRate)})`,
      money(economics.baseAmount),
    ],
    ...(economics.lateFee > 0
      ? [
          [
            `${labels.lateFeeLine} (${economics.overdueDays} × ${money(
              economics.dailyRate * 1.5
            )})`,
            money(economics.lateFee),
          ],
        ]
      : []),
    ...(economics.paidAmount > 0
      ? [[labels.paidLine, `-${money(economics.paidAmount)}`]]
      : []),
    ...(economics.refunded > 0
      ? [[labels.refundLine, money(economics.refunded)]]
      : []),
  ];

  const body = `
    <h1>${escapeHtml(labels.title)}</h1>
    <div class="meta">${escapeHtml(order.order_no ?? `#${order.id}`)} · ${escapeHtml(
      order.customer?.name ?? ""
    )} · ${escapeHtml(vehicleLabel(order.vehicle))}</div>

    <section>
      <h2>${escapeHtml(labels.period)}</h2>
      <table>
        ${row(labels.pickup, dateTime(order.pickup_time))}
        ${row(labels.expectedReturn, dateTime(order.expected_return))}
        ${row(labels.actualReturn, dateTime(order.actual_return))}
      </table>
    </section>

    <section>
      <h2>${escapeHtml(labels.charges)}</h2>
      <table class="lines">
        ${lines
          .map(
            ([label, value]) =>
              `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`
          )
          .join("")}
        <tr class="total"><td>${escapeHtml(
          economics.creditDue > 0 ? labels.creditDue : labels.balanceDue
        )}</td><td>${escapeHtml(
          money(economics.creditDue > 0 ? economics.creditDue : economics.balanceDue)
        )}</td></tr>
      </table>
      ${
        economics.depositHeld > 0
          ? `<p class="note">${escapeHtml(labels.depositNote)} ${escapeHtml(
              money(economics.depositHeld)
            )}</p>`
          : ""
      }
    </section>

    <p class="note">${escapeHtml(labels.estimateNote)}</p>

    <div class="signatures">
      <div>${escapeHtml(labels.customerSignature)}</div>
      <div>${escapeHtml(labels.staffSignature)}</div>
    </div>
  `;
  printDocument(labels.title, body);
}

/** Contract sheet with the free-text body captured on the record. */
export function printContract(
  contract: Record<string, unknown>,
  labels: PrintLabels
) {
  const customer = contract.customer as Record<string, unknown> | undefined;
  const order = contract.order as Record<string, unknown> | undefined;
  const body = `
    <h1>${escapeHtml(labels.title)}</h1>
    <div class="meta">${escapeHtml(contract.contract_no)} · ${escapeHtml(
      labels.printedAt
    )} ${escapeHtml(format(new Date(), "d MMM yyyy HH:mm"))}</div>

    <section>
      <h2>${escapeHtml(labels.parties)}</h2>
      <table>
        ${row(labels.customerName, customer?.name)}
        ${row(labels.phone, customer?.phone)}
        ${row(labels.orderNo, order?.order_no)}
        ${row(labels.signDate, contract.sign_date)}
        ${row(labels.status, contract.status)}
      </table>
    </section>

    <section>
      <h2>${escapeHtml(labels.body)}</h2>
      <p style="font-size:12px;color:#333;line-height:1.7;white-space:pre-wrap;margin:0">${escapeHtml(
        contract.content ?? labels.emptyBody
      )}</p>
    </section>

    <div class="signatures">
      <div>${escapeHtml(labels.customerSignature)}</div>
      <div>${escapeHtml(labels.staffSignature)}</div>
    </div>
  `;
  printDocument(labels.title, body);
}
