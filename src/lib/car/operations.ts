import { useQuery } from "@tanstack/react-query";

import { nocobaseClient } from "@nocobase/portal-sdk/client";

/**
 * Data access for the operational surfaces (fleet schedule board, rental desk,
 * compliance calendar, vehicle profile). Analytics-style aggregation lives in
 * `analytics.ts`; everything here works on records the counter staff act on.
 */

type ListQuery = Record<
  string,
  string | number | boolean | null | undefined | Array<string | number | boolean>
>;

const runList = async <T = Record<string, unknown>>(
  resource: string,
  query: ListQuery
): Promise<T[]> => {
  const response = await nocobaseClient.action<T[]>(resource, "list", {
    method: "GET",
    query,
  });
  return Array.isArray(response) ? response : [];
};

/** `list` only hands back the page, so totals come from the aggregate endpoint. */
const runCount = async (
  resource: string,
  filter?: Record<string, unknown>
): Promise<number> => {
  const response = await nocobaseClient.action<Array<Record<string, unknown>>>(
    resource,
    "query",
    {
      method: "POST",
      body: {
        measures: [{ field: ["id"], aggregation: "count", alias: "c" }],
        ...(filter ? { filter } : {}),
      },
    }
  );
  return Array.isArray(response) ? Number(response[0]?.c ?? 0) : 0;
};

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const MS_PER_DAY = 86_400_000;

export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Local `yyyy-MM-dd`, the shape NocoBase `dateOnly` columns use. */
export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export type VehicleRecord = {
  id: number;
  plate_number?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  status?: string | null;
  mileage?: number | null;
  daily_rate?: number | null;
  branchId?: number | null;
  categoryId?: number | null;
  branch?: { id: number; name?: string | null } | null;
  category?: { id: number; name?: string | null } | null;
};

export type OrderRecord = {
  id: number;
  order_no?: string | null;
  status?: string | null;
  pickup_time?: string | null;
  expected_return?: string | null;
  actual_return?: string | null;
  daily_rate?: number | null;
  total_amount?: number | null;
  cancel_reason?: string | null;
  vehicleId?: number | null;
  customerId?: number | null;
  vehicle?: VehicleRecord | null;
  customer?: {
    id: number;
    name?: string | null;
    phone?: string | null;
    credit_level?: string | null;
    member_level?: string | null;
    is_blacklisted?: boolean | null;
    license_expiry?: string | null;
  } | null;
  payment?: {
    id: number;
    amount?: number | null;
    deposit?: number | null;
    refund?: number | null;
    status?: string | null;
    payment_method?: string | null;
    payment_time?: string | null;
  } | null;
  payments?: Array<{
    id: number;
    amount?: number | null;
    deposit?: number | null;
    refund?: number | null;
    status?: string | null;
    payment_method?: string | null;
    payment_time?: string | null;
  }>;
};

export const vehicleLabel = (vehicle?: VehicleRecord | null): string => {
  if (!vehicle) return "-";
  const plate = vehicle.plate_number ?? "";
  const model = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  return plate && model ? `${plate} · ${model}` : plate || model || `#${vehicle.id}`;
};

/* ------------------------------------------------------------------ */
/* Order economics                                                     */
/* ------------------------------------------------------------------ */

/**
 * Overdue is billed at 150% of the daily rate per started day. The backend has
 * no late-fee column, so this is an on-screen estimate the counter uses when
 * settling — it is always labelled as such in the UI.
 */
export const LATE_FEE_MULTIPLIER = 1.5;

export type OrderEconomics = {
  plannedDays: number;
  elapsedDays: number;
  chargeableDays: number;
  overdueDays: number;
  overdueMs: number;
  isOverdue: boolean;
  dailyRate: number;
  baseAmount: number;
  lateFee: number;
  estimatedTotal: number;
  paidAmount: number;
  depositHeld: number;
  refunded: number;
  balanceDue: number;
  creditDue: number;
  timelineIssues: OrderTimelineIssue[];
};

export type OrderTimelineIssue =
  | "expectedNotAfterPickup"
  | "actualBeforePickup"
  | "reservedPastDue"
  | "ongoingBeforePickup";

export const getOrderTimelineIssues = (
  order: OrderRecord,
  now: Date = new Date()
): OrderTimelineIssue[] => {
  const pickup = parseDate(order.pickup_time);
  const expected = parseDate(order.expected_return);
  const actual = parseDate(order.actual_return);
  const issues: OrderTimelineIssue[] = [];
  if (pickup && expected && expected.getTime() <= pickup.getTime()) {
    issues.push("expectedNotAfterPickup");
  }
  if (pickup && actual && actual.getTime() < pickup.getTime()) {
    issues.push("actualBeforePickup");
  }
  if (
    order.status === "reserved" &&
    expected &&
    expected.getTime() < now.getTime()
  ) {
    issues.push("reservedPastDue");
  }
  if (
    order.status === "ongoing" &&
    pickup &&
    pickup.getTime() > now.getTime()
  ) {
    issues.push("ongoingBeforePickup");
  }
  return issues;
};

const ceilDays = (ms: number): number =>
  ms <= 0 ? 0 : Math.ceil(ms / MS_PER_DAY);

export const computeOrderEconomics = (
  order: OrderRecord,
  now: Date = new Date()
): OrderEconomics => {
  const pickup = parseDate(order.pickup_time);
  const expected = parseDate(order.expected_return);
  const actual = parseDate(order.actual_return);
  const dailyRate = num(order.daily_rate ?? order.vehicle?.daily_rate);
  const timelineIssues = getOrderTimelineIssues(order, now);

  const plannedDays =
    pickup && expected && expected.getTime() > pickup.getTime()
      ? ceilDays(expected.getTime() - pickup.getTime())
      : 0;
  const endReference = actual ?? (order.status === "reserved" ? expected : now);
  const elapsedDays =
    pickup && endReference && endReference.getTime() >= pickup.getTime()
      ? ceilDays(endReference.getTime() - pickup.getTime())
      : 0;

  // Cancelled orders never accrue time-based charges.
  const settled = order.status === "completed" || order.status === "cancelled";
  const overdueReference = actual ?? now;
  const overdueMs =
    expected &&
    (order.status === "ongoing" || order.status === "completed")
      ? Math.max(0, overdueReference.getTime() - expected.getTime())
      : 0;
  const overdueDays = ceilDays(overdueMs);

  const chargeableDays = Math.max(plannedDays, settled ? elapsedDays : plannedDays);
  const baseAmount = num(order.total_amount) || dailyRate * plannedDays;
  const lateFee = order.status === "cancelled" ? 0 : overdueDays * dailyRate * LATE_FEE_MULTIPLIER;

  const payments = order.payments ?? (order.payment ? [order.payment] : []);
  const paidAmount = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + num(payment.amount), 0);
  const depositHeld = payments.reduce(
    (sum, payment) => sum + num(payment.deposit) - num(payment.refund),
    0
  );
  const refunded = payments.reduce(
    (sum, payment) => sum + num(payment.refund),
    0
  );
  const estimatedTotal = baseAmount + lateFee;

  return {
    plannedDays,
    elapsedDays,
    chargeableDays,
    overdueDays,
    overdueMs,
    isOverdue: overdueMs > 0,
    dailyRate,
    baseAmount,
    lateFee,
    estimatedTotal,
    paidAmount,
    depositHeld,
    refunded,
    balanceDue: Math.max(0, estimatedTotal - paidAmount),
    creditDue: Math.max(0, paidAmount - estimatedTotal),
    timelineIssues,
  };
};

/* ------------------------------------------------------------------ */
/* Order lifecycle                                                     */
/* ------------------------------------------------------------------ */

export type OrderStatus = "reserved" | "ongoing" | "completed" | "cancelled";

/**
 * Legal transitions of the rental lifecycle. The counter advances an order with
 * an explicit action rather than picking a status from a dropdown, so an order
 * can never jump from `reserved` straight to `completed`.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  reserved: ["ongoing", "cancelled"],
  ongoing: ["completed"],
  completed: [],
  cancelled: [],
};

export const canTransitionOrder = (
  from: string | null | undefined,
  to: OrderStatus
): boolean => {
  const allowed = ORDER_TRANSITIONS[(from ?? "") as OrderStatus];
  return Array.isArray(allowed) && allowed.includes(to);
};

/* ------------------------------------------------------------------ */
/* Fleet schedule board                                                */
/* ------------------------------------------------------------------ */

export type ScheduleBlockKind = "order" | "maintenance" | "dispatch";

export type ScheduleBlock = {
  id: string;
  recordId: number;
  vehicleId: number;
  kind: ScheduleBlockKind;
  status: string | null;
  start: Date;
  end: Date;
  title: string;
  subtitle: string | null;
  overdue: boolean;
};

export type ScheduleVehicleRow = {
  vehicle: VehicleRecord;
  blocks: ScheduleBlock[];
  bookedDays: number;
};

export type FleetScheduleFilters = {
  branchId?: string;
  categoryId?: string;
  status?: string;
  search?: string;
};

export type FleetScheduleData = {
  rows: ScheduleVehicleRow[];
  totalVehicles: number;
  bookedVehicles: number;
  blockedVehicles: number;
  utilization: number;
};

const scheduleVehicleFilter = (filters: FleetScheduleFilters) => {
  const filter: Record<string, unknown> = {};
  if (filters.branchId) filter.branchId = { $eq: filters.branchId };
  if (filters.categoryId) filter.categoryId = { $eq: filters.categoryId };
  if (filters.status) filter.status = { $eq: filters.status };
  const search = filters.search?.trim();
  if (search) {
    filter.$or = [
      { plate_number: { $includes: search } },
      { brand: { $includes: search } },
      { model: { $includes: search } },
    ];
  }
  return filter;
};

export const useFleetSchedule = (
  rangeStart: Date,
  days: number,
  filters: FleetScheduleFilters
) =>
  useQuery({
    queryKey: [
      "car",
      "schedule",
      toDateKey(rangeStart),
      days,
      filters.branchId ?? "",
      filters.categoryId ?? "",
      filters.status ?? "",
      filters.search ?? "",
    ],
    queryFn: async (): Promise<FleetScheduleData> => {
      const start = startOfDay(rangeStart);
      const end = addDays(start, days);
      const vehicleFilter = scheduleVehicleFilter(filters);

      const vehicles = await runList<VehicleRecord>("scm_vehicles", {
        pageSize: 200,
        sort: "plate_number",
        appends: ["branch", "category"],
        ...(Object.keys(vehicleFilter).length
          ? { filter: JSON.stringify(vehicleFilter) }
          : {}),
      });
      // Blocks are fetched by date window only and matched to the visible
      // vehicles in memory: an `$in` over 200 snowflake ids would blow up the
      // query string, and the window keeps the result sets small anyway.
      const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
      if (!vehicleIds.size) {
        return {
          rows: [],
          totalVehicles: 0,
          bookedVehicles: 0,
          blockedVehicles: 0,
          utilization: 0,
        };
      }

      const [orders, maintenance, dispatch] = await Promise.all([
        runList<OrderRecord>("scm_rental_orders", {
          pageSize: 500,
          appends: ["customer"],
          filter: JSON.stringify({
            status: { $ne: "cancelled" },
            pickup_time: { $lt: end.toISOString() },
            expected_return: { $gt: start.toISOString() },
          }),
        }),
        runList<{
          id: number;
          vehicleId: number;
          type?: string | null;
          date?: string | null;
          next_date?: string | null;
          description?: string | null;
        }>("scm_maintenance", {
          pageSize: 500,
          filter: JSON.stringify({
            date: { $dateBetween: [toDateKey(start), toDateKey(end)] },
          }),
        }),
        runList<{
          id: number;
          vehicleId: number;
          status?: string | null;
          dispatch_date?: string | null;
          dispatch_no?: string | null;
          from_branch?: { name?: string | null } | null;
          to_branch?: { name?: string | null } | null;
        }>("scm_dispatch", {
          pageSize: 500,
          appends: ["from_branch", "to_branch"],
          filter: JSON.stringify({
            dispatch_date: { $dateBetween: [toDateKey(start), toDateKey(end)] },
          }),
        }),
      ]);

      const now = new Date();
      const blocksByVehicle = new Map<number, ScheduleBlock[]>();
      const push = (block: ScheduleBlock) => {
        if (!vehicleIds.has(block.vehicleId)) return;
        const list = blocksByVehicle.get(block.vehicleId);
        if (list) list.push(block);
        else blocksByVehicle.set(block.vehicleId, [block]);
      };

      for (const order of orders) {
        const pickup = parseDate(order.pickup_time);
        const expected = parseDate(order.expected_return);
        const actual = parseDate(order.actual_return);
        if (!pickup || !expected || !order.vehicleId) continue;
        const blockEnd = actual ?? expected;
        push({
          id: `order-${order.id}`,
          recordId: order.id,
          vehicleId: order.vehicleId,
          kind: "order",
          status: order.status ?? null,
          start: pickup,
          end: blockEnd > pickup ? blockEnd : new Date(pickup.getTime() + MS_PER_DAY),
          title: order.customer?.name ?? order.order_no ?? `#${order.id}`,
          subtitle: order.order_no ?? null,
          overdue:
            order.status === "ongoing" && expected.getTime() < now.getTime(),
        });
      }

      for (const record of maintenance) {
        const date = parseDate(record.date);
        if (!date || !record.vehicleId) continue;
        push({
          id: `maintenance-${record.id}`,
          recordId: record.id,
          vehicleId: record.vehicleId,
          kind: "maintenance",
          status: record.type ?? null,
          start: date,
          end: addDays(date, 1),
          title: record.type ?? "maintenance",
          subtitle: record.description ?? null,
          overdue: false,
        });
      }

      for (const record of dispatch) {
        const date = parseDate(record.dispatch_date);
        if (!date || !record.vehicleId) continue;
        push({
          id: `dispatch-${record.id}`,
          recordId: record.id,
          vehicleId: record.vehicleId,
          kind: "dispatch",
          status: record.status ?? null,
          start: date,
          end: addDays(date, 1),
          title: [record.from_branch?.name, record.to_branch?.name]
            .filter(Boolean)
            .join(" → "),
          subtitle: record.dispatch_no ?? null,
          overdue: false,
        });
      }

      const windowMs = end.getTime() - start.getTime();
      let bookedVehicles = 0;
      let blockedVehicles = 0;
      let bookedMs = 0;

      const rows: ScheduleVehicleRow[] = vehicles.map((vehicle) => {
        const blocks = (blocksByVehicle.get(vehicle.id) ?? []).sort(
          (a, b) => a.start.getTime() - b.start.getTime()
        );
        const orderMs = blocks
          .filter((block) => block.kind === "order")
          .reduce((sum, block) => {
            const from = Math.max(block.start.getTime(), start.getTime());
            const to = Math.min(block.end.getTime(), end.getTime());
            return sum + Math.max(0, to - from);
          }, 0);
        if (orderMs > 0) bookedVehicles += 1;
        if (blocks.some((block) => block.kind !== "order")) blockedVehicles += 1;
        bookedMs += orderMs;
        return {
          vehicle,
          blocks,
          bookedDays: orderMs / MS_PER_DAY,
        };
      });

      return {
        rows,
        totalVehicles: vehicles.length,
        bookedVehicles,
        blockedVehicles,
        utilization: vehicles.length
          ? bookedMs / (vehicles.length * windowMs)
          : 0,
      };
    },
  });

/** Branch / category option lists shared by the operational filter bars. */
export const useOperationFilterOptions = () =>
  useQuery({
    queryKey: ["car", "operations", "filter-options"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [branches, categories] = await Promise.all([
        runList<{ id: number; name?: string | null }>("scm_branches", {
          pageSize: 100,
          sort: "name",
        }),
        runList<{ id: number; name?: string | null }>(
          "scm_vehicle_categories",
          { pageSize: 100, sort: "name" }
        ),
      ]);
      return { branches, categories };
    },
  });

/* ------------------------------------------------------------------ */
/* Rental desk                                                         */
/* ------------------------------------------------------------------ */

export type PaymentRecord = {
  id: number;
  amount?: number | null;
  deposit?: number | null;
  refund?: number | null;
  status?: string | null;
  payment_method?: string | null;
  payment_time?: string | null;
  order?: OrderRecord | null;
};

export type RentalDeskData = {
  pickups: OrderRecord[];
  returns: OrderRecord[];
  overdue: OrderRecord[];
  receivables: PaymentRecord[];
  ongoing: number;
};

const DESK_APPENDS = ["vehicle", "customer", "payment"];

/** The single definition of a return that is still due at the counter. */
export const dueReturnFilter = (startIso: string, endIso: string) => ({
  status: { $eq: "ongoing" },
  expected_return: { $dateBetween: [startIso, endIso] },
});

export const useRentalDesk = (day: Date) =>
  useQuery({
    queryKey: ["car", "desk", toDateKey(day)],
    queryFn: async (): Promise<RentalDeskData> => {
      const start = startOfDay(day);
      const end = addDays(start, 1);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const nowIso = new Date().toISOString();

      const [pickups, returns, overdue, receivables, ongoing] = await Promise.all([
        runList<OrderRecord>("scm_rental_orders", {
          pageSize: 50,
          sort: "pickup_time",
          appends: DESK_APPENDS,
          filter: JSON.stringify({
            status: { $in: ["reserved", "ongoing"] },
            pickup_time: { $dateBetween: [startIso, endIso] },
          }),
        }),
        runList<OrderRecord>("scm_rental_orders", {
          pageSize: 50,
          sort: "expected_return",
          appends: DESK_APPENDS,
          filter: JSON.stringify(dueReturnFilter(startIso, endIso)),
        }),
        runList<OrderRecord>("scm_rental_orders", {
          pageSize: 50,
          sort: "expected_return",
          appends: DESK_APPENDS,
          filter: JSON.stringify({
            status: { $eq: "ongoing" },
            expected_return: { $lt: nowIso },
          }),
        }),
        // Receivables are payment-centric: the settlement record carries the
        // amount and method, the order only tells us who owes it.
        runList<PaymentRecord>("scm_payments", {
          pageSize: 50,
          sort: "payment_time",
          appends: ["order", "order.vehicle", "order.customer"],
          filter: JSON.stringify({ status: { $eq: "pending" } }),
        }),
        runCount("scm_rental_orders", { status: { $eq: "ongoing" } }),
      ]);

      return {
        pickups,
        returns,
        overdue,
        receivables,
        ongoing,
      };
    },
  });

/* ------------------------------------------------------------------ */
/* Compliance calendar                                                 */
/* ------------------------------------------------------------------ */

export type ComplianceKind =
  | "insurance"
  | "maintenance"
  | "license"
  | "violation"
  | "todo";

export type ComplianceItem = {
  id: string;
  recordId: number;
  kind: ComplianceKind;
  dueDate: Date;
  daysLeft: number;
  title: string;
  subtitle: string | null;
  resource: string;
  amount: number | null;
};

export type ComplianceData = {
  items: ComplianceItem[];
  overdue: number;
  dueThisWeek: number;
  byKind: Record<ComplianceKind, number>;
};

export const useComplianceCalendar = (horizonDays: number) =>
  useQuery({
    queryKey: ["car", "compliance", horizonDays],
    queryFn: async (): Promise<ComplianceData> => {
      const today = startOfDay(new Date());
      const horizon = addDays(today, horizonDays);
      const past = addDays(today, -180);
      const horizonKey = toDateKey(horizon);
      const pastKey = toDateKey(past);

      const [insurance, maintenance, licenses, violations, todos] =
        await Promise.all([
          runList<{
            id: number;
            policy_number?: string | null;
            provider?: string | null;
            type?: string | null;
            premium?: number | null;
            end_date?: string | null;
            vehicle?: VehicleRecord | null;
          }>("scm_insurance", {
            pageSize: 200,
            sort: "end_date",
            appends: ["vehicle"],
            filter: JSON.stringify({
              end_date: { $dateBetween: [pastKey, horizonKey] },
            }),
          }),
          runList<{
            id: number;
            type?: string | null;
            next_date?: string | null;
            cost?: number | null;
            vehicle?: VehicleRecord | null;
          }>("scm_maintenance", {
            pageSize: 200,
            sort: "next_date",
            appends: ["vehicle"],
            filter: JSON.stringify({
              next_date: { $dateBetween: [pastKey, horizonKey] },
            }),
          }),
          runList<{
            id: number;
            name?: string | null;
            phone?: string | null;
            license_number?: string | null;
            license_expiry?: string | null;
          }>("scm_customers", {
            pageSize: 200,
            sort: "license_expiry",
            filter: JSON.stringify({
              license_expiry: { $dateBetween: [pastKey, horizonKey] },
            }),
          }),
          runList<{
            id: number;
            date?: string | null;
            fine_amount?: number | null;
            location?: string | null;
            vehicle?: VehicleRecord | null;
          }>("scm_violations", {
            pageSize: 200,
            sort: "date",
            appends: ["vehicle"],
            filter: JSON.stringify({ status: { $eq: "pending" } }),
          }),
          runList<{
            id: number;
            title?: string | null;
            kind?: string | null;
            due_date?: string | null;
            description?: string | null;
          }>("scm_car_todos", {
            pageSize: 200,
            sort: "due_date",
            filter: JSON.stringify({
              status: { $eq: "open" },
              due_date: { $dateBetween: [pastKey, horizonKey] },
            }),
          }),
        ]);

      const items: ComplianceItem[] = [];
      const dayDiff = (date: Date) =>
        Math.round((startOfDay(date).getTime() - today.getTime()) / MS_PER_DAY);

      for (const record of insurance) {
        const due = parseDate(record.end_date);
        if (!due) continue;
        items.push({
          id: `insurance-${record.id}`,
          recordId: record.id,
          kind: "insurance",
          dueDate: due,
          daysLeft: dayDiff(due),
          title: vehicleLabel(record.vehicle),
          subtitle: [record.provider, record.policy_number]
            .filter(Boolean)
            .join(" · ") || null,
          resource: "scm_insurance",
          amount: record.premium ?? null,
        });
      }

      for (const record of maintenance) {
        const due = parseDate(record.next_date);
        if (!due) continue;
        items.push({
          id: `maintenance-${record.id}`,
          recordId: record.id,
          kind: "maintenance",
          dueDate: due,
          daysLeft: dayDiff(due),
          title: vehicleLabel(record.vehicle),
          subtitle: record.type ?? null,
          resource: "scm_maintenance",
          amount: record.cost ?? null,
        });
      }

      for (const record of licenses) {
        const due = parseDate(record.license_expiry);
        if (!due) continue;
        items.push({
          id: `license-${record.id}`,
          recordId: record.id,
          kind: "license",
          dueDate: due,
          daysLeft: dayDiff(due),
          title: record.name ?? `#${record.id}`,
          subtitle: record.license_number ?? record.phone ?? null,
          resource: "scm_customers",
          amount: null,
        });
      }

      for (const record of violations) {
        const due = parseDate(record.date);
        if (!due) continue;
        items.push({
          id: `violation-${record.id}`,
          recordId: record.id,
          kind: "violation",
          dueDate: due,
          daysLeft: dayDiff(due),
          title: vehicleLabel(record.vehicle),
          subtitle: record.location ?? null,
          resource: "scm_violations",
          amount: record.fine_amount ?? null,
        });
      }

      for (const record of todos) {
        const due = parseDate(record.due_date);
        if (!due) continue;
        items.push({
          id: `todo-${record.id}`,
          recordId: record.id,
          kind: "todo",
          dueDate: due,
          daysLeft: dayDiff(due),
          title: record.title ?? `#${record.id}`,
          subtitle: record.description ?? null,
          resource: "scm_car_todos",
          amount: null,
        });
      }

      items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      const byKind: Record<ComplianceKind, number> = {
        insurance: 0,
        maintenance: 0,
        license: 0,
        violation: 0,
        todo: 0,
      };
      for (const item of items) byKind[item.kind] += 1;

      return {
        items,
        overdue: items.filter((item) => item.daysLeft < 0).length,
        dueThisWeek: items.filter(
          (item) => item.daysLeft >= 0 && item.daysLeft <= 7
        ).length,
        byKind,
      };
    },
  });

/* ------------------------------------------------------------------ */
/* Revenue composition                                                 */
/* ------------------------------------------------------------------ */

export type RevenueSlice = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
};

export type RevenueComposition = {
  byBranch: RevenueSlice[];
  byCategory: RevenueSlice[];
};

/**
 * Revenue split by branch and by vehicle class. The aggregate endpoint only
 * groups one relation hop deep, so orders are grouped by vehicle and joined to
 * the fleet in memory.
 */
export const useRevenueComposition = () =>
  useQuery({
    queryKey: ["car", "revenue-composition"],
    queryFn: async (): Promise<RevenueComposition> => {
      const [orderRows, vehicles] = await Promise.all([
        nocobaseClient.action<Array<Record<string, unknown>>>(
          "scm_rental_orders",
          "query",
          {
            method: "POST",
            body: {
              measures: [
                { field: ["total_amount"], aggregation: "sum", alias: "revenue" },
                { field: ["id"], aggregation: "count", alias: "orders" },
              ],
              dimensions: [{ field: ["vehicleId"], alias: "vehicleId" }],
              filter: { status: { $ne: "cancelled" } },
            },
          }
        ),
        runList<VehicleRecord>("scm_vehicles", {
          pageSize: 500,
          appends: ["branch", "category"],
        }),
      ]);

      const byId = new Map(vehicles.map((vehicle) => [String(vehicle.id), vehicle]));
      const branches = new Map<string, RevenueSlice>();
      const categories = new Map<string, RevenueSlice>();

      const add = (
        target: Map<string, RevenueSlice>,
        label: string,
        revenue: number,
        orders: number
      ) => {
        const existing = target.get(label);
        if (existing) {
          existing.revenue += revenue;
          existing.orders += orders;
        } else {
          target.set(label, { key: label, label, revenue, orders });
        }
      };

      for (const row of Array.isArray(orderRows) ? orderRows : []) {
        const vehicle = byId.get(String(row.vehicleId));
        if (!vehicle) continue;
        const revenue = num(row.revenue);
        const orders = num(row.orders);
        add(branches, vehicle.branch?.name ?? "—", revenue, orders);
        add(categories, vehicle.category?.name ?? "—", revenue, orders);
      }

      const sorted = (target: Map<string, RevenueSlice>) =>
        Array.from(target.values()).sort((a, b) => b.revenue - a.revenue);

      return { byBranch: sorted(branches), byCategory: sorted(categories) };
    },
  });

/* ------------------------------------------------------------------ */
/* List summary strip                                                  */
/* ------------------------------------------------------------------ */

export type ResourceSummary = {
  total: number;
  byStatus: Array<{ value: string; count: number }>;
  amountTotal: number | null;
};

/**
 * Totals for the strip above a list: how many records exist, how they split
 * across the status field and — where the collection has one — the sum of its
 * money column. Each segment doubles as a filter shortcut.
 */
export const useResourceSummary = (
  resource: string,
  statusField?: string,
  amountField?: string
) =>
  useQuery({
    queryKey: ["car", "summary", resource, statusField ?? "", amountField ?? ""],
    queryFn: async (): Promise<ResourceSummary> => {
      const [total, statusRows, amountRows] = await Promise.all([
        runCount(resource),
        statusField
          ? nocobaseClient.action<Array<Record<string, unknown>>>(
              resource,
              "query",
              {
                method: "POST",
                body: {
                  measures: [
                    { field: ["id"], aggregation: "count", alias: "c" },
                  ],
                  dimensions: [{ field: [statusField], alias: "status" }],
                },
              }
            )
          : Promise.resolve([]),
        amountField
          ? nocobaseClient.action<Array<Record<string, unknown>>>(
              resource,
              "query",
              {
                method: "POST",
                body: {
                  measures: [
                    { field: [amountField], aggregation: "sum", alias: "total" },
                  ],
                },
              }
            )
          : Promise.resolve([]),
      ]);

      return {
        total,
        byStatus: (Array.isArray(statusRows) ? statusRows : [])
          .filter((row) => row.status !== null && row.status !== undefined)
          .map((row) => ({
            value: String(row.status),
            count: num(row.c),
          }))
          .sort((a, b) => b.count - a.count),
        amountTotal: amountField
          ? num((Array.isArray(amountRows) ? amountRows : [])[0]?.total)
          : null,
      };
    },
  });

/* ------------------------------------------------------------------ */
/* Vehicle profile                                                     */
/* ------------------------------------------------------------------ */

export type VehicleProfile = {
  vehicle: VehicleRecord | null;
  orders: OrderRecord[];
  maintenance: Array<{
    id: number;
    type?: string | null;
    date?: string | null;
    next_date?: string | null;
    cost?: number | null;
    description?: string | null;
  }>;
  insurance: Array<{
    id: number;
    type?: string | null;
    provider?: string | null;
    policy_number?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    premium?: number | null;
  }>;
  violations: Array<{
    id: number;
    date?: string | null;
    status?: string | null;
    location?: string | null;
    points?: number | null;
    fine_amount?: number | null;
    description?: string | null;
  }>;
  dispatch: Array<{
    id: number;
    dispatch_no?: string | null;
    dispatch_date?: string | null;
    status?: string | null;
    reason?: string | null;
    from_branch?: { name?: string | null } | null;
    to_branch?: { name?: string | null } | null;
  }>;
  revenue: number;
  maintenanceCost: number;
  insuranceCost: number;
  violationCost: number;
  profit: number;
  rentedDays: number;
  utilization: number;
  nextServiceDate: Date | null;
  insuranceExpiry: Date | null;
};

const UTILIZATION_WINDOW_DAYS = 90;

export const useVehicleProfile = (vehicleId?: string) =>
  useQuery({
    queryKey: ["car", "vehicle-profile", vehicleId],
    enabled: Boolean(vehicleId),
    queryFn: async (): Promise<VehicleProfile> => {
      const filter = JSON.stringify({ vehicleId: { $eq: vehicleId } });
      const [vehicles, orders, maintenance, insurance, violations, dispatch] =
        await Promise.all([
          runList<VehicleRecord>("scm_vehicles", {
            pageSize: 1,
            appends: ["branch", "category"],
            filter: JSON.stringify({ id: { $eq: vehicleId } }),
          }),
          runList<OrderRecord>("scm_rental_orders", {
            pageSize: 100,
            sort: "-pickup_time",
            appends: ["customer", "payment"],
            filter,
          }),
          runList<VehicleProfile["maintenance"][number]>("scm_maintenance", {
            pageSize: 100,
            sort: "-date",
            filter,
          }),
          runList<VehicleProfile["insurance"][number]>("scm_insurance", {
            pageSize: 100,
            sort: "-end_date",
            filter,
          }),
          runList<VehicleProfile["violations"][number]>("scm_violations", {
            pageSize: 100,
            sort: "-date",
            filter,
          }),
          runList<VehicleProfile["dispatch"][number]>("scm_dispatch", {
            pageSize: 100,
            sort: "-dispatch_date",
            appends: ["from_branch", "to_branch"],
            filter,
          }),
        ]);

      const revenue = orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + num(order.total_amount), 0);
      const maintenanceCost = maintenance.reduce(
        (sum, record) => sum + num(record.cost),
        0
      );
      const insuranceCost = insurance.reduce(
        (sum, record) => sum + num(record.premium),
        0
      );
      const violationCost = violations.reduce(
        (sum, record) => sum + num(record.fine_amount),
        0
      );

      const windowEnd = new Date();
      const windowStart = addDays(startOfDay(windowEnd), -UTILIZATION_WINDOW_DAYS);
      let rentedMs = 0;
      for (const order of orders) {
        if (order.status === "cancelled") continue;
        const pickup = parseDate(order.pickup_time);
        const end = parseDate(order.actual_return ?? order.expected_return);
        if (!pickup || !end) continue;
        const from = Math.max(pickup.getTime(), windowStart.getTime());
        const to = Math.min(end.getTime(), windowEnd.getTime());
        rentedMs += Math.max(0, to - from);
      }
      const windowMs = windowEnd.getTime() - windowStart.getTime();

      const futureService = maintenance
        .map((record) => parseDate(record.next_date))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime());
      const coverage = insurance
        .map((record) => parseDate(record.end_date))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime());

      return {
        vehicle: vehicles[0] ?? null,
        orders,
        maintenance,
        insurance,
        violations,
        dispatch,
        revenue,
        maintenanceCost,
        insuranceCost,
        violationCost,
        profit: revenue - maintenanceCost - insuranceCost - violationCost,
        rentedDays: rentedMs / MS_PER_DAY,
        utilization: windowMs ? rentedMs / windowMs : 0,
        nextServiceDate: futureService[0] ?? null,
        insuranceExpiry: coverage[0] ?? null,
      };
    },
  });

export const VEHICLE_UTILIZATION_WINDOW_DAYS = UTILIZATION_WINDOW_DAYS;
