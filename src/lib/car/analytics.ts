import { useQuery } from "@tanstack/react-query";

import { nocobaseClient } from "@nocobase/portal-sdk/client";

type QueryRow = Record<string, string | number | null>;

const runAggregate = async (
  resource: string,
  measures: unknown[],
  dimensions?: unknown[],
  filter?: unknown
): Promise<QueryRow[]> => {
  const response = await nocobaseClient.action<QueryRow[]>(
    resource,
    "query",
    {
      method: "POST",
      body: {
        measures,
        ...(dimensions ? { dimensions } : {}),
        ...(filter ? { filter } : {}),
      },
    }
  );
  return Array.isArray(response) ? response : [];
};

const runList = async <T = Record<string, unknown>>(
  resource: string,
  query: Record<string, string | number | boolean | null | undefined | Array<string | number | boolean>>
): Promise<T[]> => {
  const response = await nocobaseClient.action<T[]>(resource, "list", {
    method: "GET",
    query,
  });
  return Array.isArray(response) ? response : [];
};

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type VehicleRef = {
  id: number;
  plate_number?: string | null;
  brand?: string | null;
  model?: string | null;
  daily_rate?: number | null;
  status?: string | null;
  category?: { name?: string | null } | null;
};

export type ProfitabilityRow = {
  vehicleId: number;
  plate: string;
  brand: string;
  model: string;
  category: string | null;
  dailyRate: number | null;
  status: string | null;
  income: number;
  orderCount: number;
  maintenanceCost: number;
  insuranceCost: number;
  violationCost: number;
  totalCost: number;
  profit: number;
  roi: number | null;
  verdict: "winner" | "loser" | "neutral";
};

const EMPTY_PROFITABILITY: ProfitabilityRow[] = [];

export const useVehicleProfitability = () =>
  useQuery({
    queryKey: ["car", "analytics", "profitability"],
    queryFn: async () => {
      const [
        incomeRows,
        maintenanceRows,
        insuranceRows,
        violationRows,
        vehicleList,
      ] = await Promise.all([
        runAggregate(
          "scm_rental_orders",
          [
            { field: ["id"], aggregation: "count", alias: "orders" },
            {
              field: ["total_amount"],
              aggregation: "sum",
              alias: "income",
            },
          ],
          [{ field: ["vehicleId"], alias: "vehicleId" }],
          { status: { $ne: "cancelled" } }
        ),
        runAggregate(
          "scm_maintenance",
          [{ field: ["cost"], aggregation: "sum", alias: "cost" }],
          [{ field: ["vehicleId"], alias: "vehicleId" }]
        ),
        runAggregate(
          "scm_insurance",
          [{ field: ["premium"], aggregation: "sum", alias: "premium" }],
          [{ field: ["vehicleId"], alias: "vehicleId" }]
        ),
        runAggregate(
          "scm_violations",
          [
            {
              field: ["fine_amount"],
              aggregation: "sum",
              alias: "fine",
            },
          ],
          [{ field: ["vehicleId"], alias: "vehicleId" }]
        ),
        runList<VehicleRef>("scm_vehicles", {
          appends: ["category"],
          fields: ["id", "plate_number", "brand", "model", "daily_rate", "status"],
          pageSize: 500,
        }),
      ]);

      const incomeByVehicle = new Map<number, { income: number; orders: number }>();
      for (const row of incomeRows) {
        incomeByVehicle.set(num(row.vehicleId), {
          income: num(row.income),
          orders: num(row.orders),
        });
      }
      const maintenanceByVehicle = new Map<number, number>();
      for (const row of maintenanceRows) {
        maintenanceByVehicle.set(num(row.vehicleId), num(row.cost));
      }
      const insuranceByVehicle = new Map<number, number>();
      for (const row of insuranceRows) {
        insuranceByVehicle.set(num(row.vehicleId), num(row.premium));
      }
      const violationByVehicle = new Map<number, number>();
      for (const row of violationRows) {
        violationByVehicle.set(num(row.vehicleId), num(row.fine));
      }

      return (vehicleList ?? []).map((vehicle) => {
        const income = incomeByVehicle.get(vehicle.id)?.income ?? 0;
        const maintenanceCost = maintenanceByVehicle.get(vehicle.id) ?? 0;
        const insuranceCost = insuranceByVehicle.get(vehicle.id) ?? 0;
        const violationCost = violationByVehicle.get(vehicle.id) ?? 0;
        const totalCost = maintenanceCost + insuranceCost + violationCost;
        const profit = income - totalCost;
        const roi =
          totalCost > 0 ? profit / totalCost : income > 0 ? null : null;
        const verdict: ProfitabilityRow["verdict"] =
          profit > 0 ? "winner" : profit < 0 ? "loser" : "neutral";
        return {
          vehicleId: vehicle.id,
          plate: vehicle.plate_number ?? "—",
          brand: vehicle.brand ?? "—",
          model: vehicle.model ?? "—",
          category: vehicle.category?.name ?? null,
          dailyRate: vehicle.daily_rate ?? null,
          status: vehicle.status ?? null,
          income,
          orderCount: incomeByVehicle.get(vehicle.id)?.orders ?? 0,
          maintenanceCost,
          insuranceCost,
          violationCost,
          totalCost,
          profit,
          roi,
          verdict,
        };
      });
    },
  });

export const useProfitabilitySummary = () => {
  const { data } = useVehicleProfitability();
  const rows = data ?? EMPTY_PROFITABILITY;
  const winners = rows.filter((row) => row.verdict === "winner").length;
  const losers = rows.filter((row) => row.verdict === "loser").length;
  const totalIncome = rows.reduce((sum, row) => sum + row.income, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);
  const invested = rows.filter((row) => row.totalCost > 0);
  const avgRoi =
    invested.length > 0
      ? invested.reduce((sum, row) => sum + (row.roi ?? 0), 0) /
        invested.length
      : 0;
  return {
    rows,
    winners,
    losers,
    totalIncome,
    totalCost,
    totalProfit,
    avgRoi,
  };
};

export type UtilizationRow = {
  vehicleId: number;
  plate: string;
  brand: string;
  model: string;
  category: string | null;
  dailyRate: number | null;
  occupiedDays: number;
  daysInMonth: number;
  utilization: number;
  lowUtilization: boolean;
};

export const useUtilization = (month: string) =>
  useQuery({
    queryKey: ["car", "analytics", "utilization", month],
    queryFn: async () => {
      const [orders, vehicleList] = await Promise.all([
        runList<
          Record<string, unknown> & {
            vehicleId?: number | null;
            pickup_time?: string | null;
            expected_return?: string | null;
            actual_return?: string | null;
          }
        >("scm_rental_orders", {
          filter: JSON.stringify({ status: { $ne: "cancelled" } }),
          fields: ["id", "vehicleId", "pickup_time", "expected_return", "actual_return"],
          pageSize: 1000,
        }),
        runList<VehicleRef>("scm_vehicles", {
          appends: ["category"],
          fields: ["id", "plate_number", "brand", "model", "daily_rate", "status"],
          pageSize: 500,
        }),
      ]);

      const [year, monthIndex] = month.split("-").map(Number);
      const start = new Date(year, monthIndex - 1, 1);
      const end = new Date(year, monthIndex, 0);
      const daysInMonth = end.getDate();

      const occupiedDaysByVehicle = new Map<number, Set<number>>();

      const addDay = (vehicleId: number, day: number) => {
        if (!occupiedDaysByVehicle.has(vehicleId)) {
          occupiedDaysByVehicle.set(vehicleId, new Set());
        }
        occupiedDaysByVehicle.get(vehicleId)!.add(day);
      };

      for (const order of orders ?? []) {
        if (!order.vehicleId) continue;
        const from = order.pickup_time ? new Date(order.pickup_time) : null;
        const toRaw =
          order.actual_return && order.actual_return !== order.expected_return
            ? order.actual_return
            : order.expected_return;
        const to = toRaw ? new Date(toRaw) : null;
        if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
          continue;
        }
        for (let d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
          if (d.getTime() > end.getTime()) break;
          if (d.getTime() < start.getTime()) continue;
          const day = d.getDate();
          if (d.getMonth() === monthIndex - 1 && d.getFullYear() === year) {
            addDay(order.vehicleId, day);
          }
        }
      }

      return (vehicleList ?? []).map((vehicle) => {
        const occupiedDays = occupiedDaysByVehicle.get(vehicle.id)?.size ?? 0;
        const utilization = occupiedDays / daysInMonth;
        return {
          vehicleId: vehicle.id,
          plate: vehicle.plate_number ?? "—",
          brand: vehicle.brand ?? "—",
          model: vehicle.model ?? "—",
          category: vehicle.category?.name ?? null,
          dailyRate: vehicle.daily_rate ?? null,
          occupiedDays,
          daysInMonth,
          utilization,
          lowUtilization: utilization < 0.4,
        };
      });
    },
  });

export type CancellationSegment = {
  key: string;
  label: string;
  total: number;
  cancelled: number;
  rate: number;
};

export type CancellationAnalysis = {
  total: number;
  cancelled: number;
  rate: number;
  byCustomerType: CancellationSegment[];
  byCategory: CancellationSegment[];
  cancelledOrders: Array<{
    id: number;
    orderNo: string;
    cancelReason: string | null;
    customer: string;
    customerType: string | null;
    vehicle: string;
    category: string | null;
    amount: number | null;
  }>;
};

type CancellationOrder = Record<string, unknown> & {
  id: number;
  order_no?: string | null;
  status?: string | null;
  cancel_reason?: string | null;
  total_amount?: number | null;
  customer?: { name?: string | null; customer_type?: string | null } | null;
  vehicle?: {
    plate_number?: string | null;
    brand?: string | null;
    model?: string | null;
    category?: { name?: string | null } | null;
  } | null;
};

const buildSegment = (
  map: Map<string, { total: number; cancelled: number }>,
  labelResolver: (key: string) => string
): CancellationSegment[] =>
  [...map.entries()]
    .map(([key, value]) => ({
      key,
      label: labelResolver(key),
      total: value.total,
      cancelled: value.cancelled,
      rate: value.total > 0 ? value.cancelled / value.total : 0,
    }))
    .sort((left, right) => right.cancelled - left.cancelled);

export const useCancellation = () =>
  useQuery({
    queryKey: ["car", "analytics", "cancellation"],
    queryFn: async () => {
      const orders = await runList<CancellationOrder>("scm_rental_orders", {
        appends: ["customer", "vehicle", "vehicle.category"],
        fields: [
          "id",
          "order_no",
          "status",
          "cancel_reason",
          "total_amount",
          "customerId",
          "vehicleId",
        ],
        pageSize: 1000,
      });

      const list = orders ?? [];
      const total = list.length;
      const cancelledList = list.filter((order) => order.status === "cancelled");
      const cancelled = cancelledList.length;

      const byCustomerType = new Map<string, { total: number; cancelled: number }>();
      const byCategory = new Map<string, { total: number; cancelled: number }>();

      for (const order of list) {
        const customerType = order.customer?.customer_type ?? "unknown";
        const category = order.vehicle?.category?.name ?? "Uncategorized";
        const typeEntry = byCustomerType.get(customerType) ?? { total: 0, cancelled: 0 };
        typeEntry.total += 1;
        if (order.status === "cancelled") typeEntry.cancelled += 1;
        byCustomerType.set(customerType, typeEntry);

        const categoryEntry = byCategory.get(category) ?? { total: 0, cancelled: 0 };
        categoryEntry.total += 1;
        if (order.status === "cancelled") categoryEntry.cancelled += 1;
        byCategory.set(category, categoryEntry);
      }

      const customerTypeLabels: Record<string, string> = {
        personal: "Personal",
        corporate: "Corporate",
        unknown: "Unknown",
      };
      const categoryLabels: Record<string, string> = {};

      return {
        total,
        cancelled,
        rate: total > 0 ? cancelled / total : 0,
        byCustomerType: buildSegment(
          byCustomerType,
          (key) => customerTypeLabels[key] ?? key
        ),
        byCategory: buildSegment(byCategory, (key) => key),
        cancelledOrders: cancelledList.map((order) => ({
          id: order.id,
          orderNo: order.order_no ?? "—",
          cancelReason: order.cancel_reason ?? null,
          customer: order.customer?.name ?? "—",
          customerType: order.customer?.customer_type ?? null,
          vehicle: order.vehicle
            ? `${order.vehicle.plate_number ?? "—"} ${order.vehicle.brand ?? ""} ${order.vehicle.model ?? ""}`.trim()
            : "—",
          category: order.vehicle?.category?.name ?? null,
          amount: order.total_amount ?? null,
        })),
      };
    },
  });

export type AgingRow = {
  orderId: number;
  orderNo: string;
  customer: string;
  vehicle: string;
  amount: number;
  outstanding: number;
  paid: number;
  daysAging: number;
  bucket: "0-30" | "31-60" | "61-90" | "90+";
};

export type DepositRow = {
  orderId: number;
  orderNo: string;
  customer: string;
  vehicle: string;
  deposit: number;
  refund: number;
  held: number;
  status: string | null;
};

export type RefundTodoRow = {
  orderId: number;
  orderNo: string;
  customer: string;
  vehicle: string;
  refundDue: number;
  daysAging: number;
};

export type CashflowAnalysis = {
  receivableTotal: number;
  depositHeldTotal: number;
  refundDueTotal: number;
  aging: AgingRow[];
  depositHeld: DepositRow[];
  refundTodo: RefundTodoRow[];
};

type PaymentRow = Record<string, unknown> & {
  id: number;
  amount?: number | null;
  deposit?: number | null;
  refund?: number | null;
  status?: string | null;
  orderId?: number | null;
};

type CashOrder = Record<string, unknown> & {
  id: number;
  order_no?: string | null;
  status?: string | null;
  total_amount?: number | null;
  expected_return?: string | null;
  actual_return?: string | null;
  customer?: { name?: string | null } | null;
  vehicle?: { plate_number?: string | null; brand?: string | null; model?: string | null } | null;
};

const daysBetween = (from: Date, to: Date): number =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));

const agingBucket = (days: number): AgingRow["bucket"] => {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
};

export const useCashflow = () =>
  useQuery({
    queryKey: ["car", "analytics", "cashflow"],
    queryFn: async () => {
      const [orders, payments] = await Promise.all([
        runList<CashOrder>("scm_rental_orders", {
          appends: ["customer", "vehicle"],
          fields: [
            "id",
            "order_no",
            "status",
            "total_amount",
            "expected_return",
            "actual_return",
            "customerId",
            "vehicleId",
          ],
          pageSize: 1000,
        }),
        runList<PaymentRow>("scm_payments", {
          fields: ["id", "amount", "deposit", "refund", "status", "orderId"],
          pageSize: 1000,
        }),
      ]);

      const orderList = orders ?? [];
      const paymentList = payments ?? [];
      const orderById = new Map(orderList.map((order) => [order.id, order]));
      const paymentsByOrder = new Map<number, PaymentRow[]>();
      for (const payment of paymentList) {
        if (!payment.orderId) continue;
        const existing = paymentsByOrder.get(payment.orderId) ?? [];
        existing.push(payment);
        paymentsByOrder.set(payment.orderId, existing);
      }

      const today = new Date();
      const aging: AgingRow[] = [];
      const depositHeld: DepositRow[] = [];
      const refundTodo: RefundTodoRow[] = [];

      for (const order of orderList) {
        if (order.status !== "completed") continue;
        const orderPayments = paymentsByOrder.get(order.id) ?? [];
        const paid = orderPayments
          .filter((payment) => payment.status === "paid")
          .reduce((sum, payment) => sum + num(payment.amount), 0);
        const total = num(order.total_amount);
        const outstanding = total - paid;
        const returnDate = order.actual_return
          ? new Date(order.actual_return)
          : order.expected_return
            ? new Date(order.expected_return)
            : null;
        const daysAging = returnDate ? daysBetween(returnDate, today) : 0;
        const label = {
          orderNo: order.order_no ?? "—",
          customer: order.customer?.name ?? "—",
          vehicle: order.vehicle
            ? `${order.vehicle.plate_number ?? "—"} ${order.vehicle.brand ?? ""} ${order.vehicle.model ?? ""}`.trim()
            : "—",
        };

        if (outstanding > 0) {
          aging.push({
            orderId: order.id,
            ...label,
            amount: total,
            outstanding,
            paid,
            daysAging,
            bucket: agingBucket(daysAging),
          });
        }

        const deposit = orderPayments.reduce(
          (sum, payment) => sum + num(payment.deposit),
          0
        );
        const refund = orderPayments.reduce(
          (sum, payment) => sum + num(payment.refund),
          0
        );
        const held = deposit - refund;
        if (held > 0) {
          depositHeld.push({
            orderId: order.id,
            ...label,
            deposit,
            refund,
            held,
            status: order.status,
          });
          refundTodo.push({
            orderId: order.id,
            ...label,
            refundDue: held,
            daysAging,
          });
        }
      }

      return {
        receivableTotal: aging.reduce((sum, row) => sum + row.outstanding, 0),
        depositHeldTotal: depositHeld.reduce((sum, row) => sum + row.held, 0),
        refundDueTotal: refundTodo.reduce((sum, row) => sum + row.refundDue, 0),
        aging,
        depositHeld,
        refundTodo,
      };
    },
  });
