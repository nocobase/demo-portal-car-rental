import { useQuery } from "@tanstack/react-query";

import { nocobaseClient } from "@nocobase/portal-sdk/client";

type QueryRow = Record<string, string | number>;

const runAggregate = async (
  resource: string,
  measures: unknown[],
  dimensions?: unknown[],
  filter?: unknown,
  orders?: unknown,
  limit?: number
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
        ...(orders ? { orders } : {}),
        ...(limit ? { limit } : {}),
      },
    }
  );
  return Array.isArray(response) ? response : [];
};

export const useMonthlyRevenue = () =>
  useQuery({
    queryKey: ["car", "revenue", "by-month"],
    queryFn: () =>
      runAggregate(
        "scm_payments",
        [{ field: ["amount"], aggregation: "sum", alias: "revenue" }],
        [{ field: ["payment_time"], alias: "month", format: "yyyy-MM" }],
        undefined,
        [{ field: "month", direction: "asc" }]
      ),
  });

export const useTopModels = (limit = 5) =>
  useQuery({
    queryKey: ["car", "top-models"],
    queryFn: () =>
      runAggregate(
        "scm_rental_orders",
        [
          { field: ["total_amount"], aggregation: "sum", alias: "revenue" },
          { field: ["id"], aggregation: "count", alias: "order_count" },
        ],
        [{ field: ["vehicle", "model"], alias: "model" }],
        undefined,
        [{ field: "revenue", direction: "desc" }],
        limit
      ),
  });

export const useTopCustomers = (limit = 5) =>
  useQuery({
    queryKey: ["car", "top-customers"],
    queryFn: () =>
      runAggregate(
        "scm_rental_orders",
        [
          { field: ["total_amount"], aggregation: "sum", alias: "revenue" },
          { field: ["id"], aggregation: "count", alias: "order_count" },
        ],
        [{ field: ["customer", "name"], alias: "customer" }],
        undefined,
        [{ field: "revenue", direction: "desc" }],
        limit
      ),
  });

export const useCarKpis = () =>
  useQuery({
    queryKey: ["car", "kpis"],
    queryFn: async () => {
      const [vehicleRows, availableRows, ongoingRows, revenueRows, customerRows] =
        await Promise.all([
          runAggregate("scm_vehicles", [
            { field: ["id"], aggregation: "count", alias: "c" },
          ]),
          runAggregate("scm_vehicles", [
            { field: ["id"], aggregation: "count", alias: "c" },
          ], undefined, { status: { $eq: "available" } }),
          runAggregate("scm_rental_orders", [
            { field: ["id"], aggregation: "count", alias: "c" },
          ], undefined, { status: { $eq: "ongoing" } }),
          runAggregate("scm_payments", [
            { field: ["amount"], aggregation: "sum", alias: "total" },
          ]),
          runAggregate("scm_customers", [
            { field: ["id"], aggregation: "count", alias: "c" },
          ]),
        ]);
      return {
        vehicles: Number(vehicleRows[0]?.c ?? 0),
        availableVehicles: Number(availableRows[0]?.c ?? 0),
        ongoingOrders: Number(ongoingRows[0]?.c ?? 0),
        revenue: Number(revenueRows[0]?.total ?? 0),
        customers: Number(customerRows[0]?.c ?? 0),
      };
    },
  });

const localDayRange = (date: Date): [string, string] => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start.getTime() + 86_400_000);
  return [start.toISOString(), end.toISOString()];
};

const monthRange = (date: Date): [string, string] => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return [start.toISOString(), end.toISOString()];
};

export const useTodayReturns = () =>
  useQuery({
    queryKey: ["car", "kpis", "today-returns"],
    queryFn: async () => {
      const [start, end] = localDayRange(new Date());
      const rows = await runAggregate(
        "scm_rental_orders",
        [{ field: ["id"], aggregation: "count", alias: "c" }],
        undefined,
        {
          status: { $ne: "cancelled" },
          expected_return: { $dateBetween: [start, end] },
        }
      );
      return Number(rows[0]?.c ?? 0);
    },
  });

export const useCurrentMonthRevenue = () =>
  useQuery({
    queryKey: ["car", "kpis", "month-revenue"],
    queryFn: async () => {
      const [start, end] = monthRange(new Date());
      const rows = await runAggregate(
        "scm_payments",
        [{ field: ["amount"], aggregation: "sum", alias: "total" }],
        undefined,
        { payment_time: { $dateBetween: [start, end] } }
      );
      return Number(rows[0]?.total ?? 0);
    },
  });

export const useOrderStatusChart = () =>
  useQuery({
    queryKey: ["car", "orders", "by-status"],
    queryFn: () =>
      runAggregate(
        "scm_rental_orders",
        [{ field: ["id"], aggregation: "count", alias: "order_count" }],
        [{ field: ["status"], alias: "status" }]
      ),
  });

export const useVehicleStatusChart = () =>
  useQuery({
    queryKey: ["car", "scm_vehicles", "by-status"],
    queryFn: () =>
      runAggregate(
        "scm_vehicles",
        [{ field: ["id"], aggregation: "count", alias: "c" }],
        [{ field: ["status"], alias: "status" }]
      ),
  });
