import { useList } from "@refinedev/core";
import { useMemo } from "react";

const RELATION_RESOURCES = [
  "scm_branches",
  "scm_vehicles",
  "scm_customers",
  "scm_vehicle_categories",
  "scm_rental_orders",
] as const;

type RelationOptions = { value: string; label: string }[];

export function useRelationOptions(
  resources: string[]
): Record<string, RelationOptions> {
  const branches = useList<Record<string, unknown>>({
    resource: "scm_branches",
    pagination: { mode: "server", currentPage: 1, pageSize: 500 },
    queryOptions: { retry: false, enabled: resources.includes("scm_branches") },
  });
  const vehicles = useList<Record<string, unknown>>({
    resource: "scm_vehicles",
    pagination: { mode: "server", currentPage: 1, pageSize: 500 },
    queryOptions: { retry: false, enabled: resources.includes("scm_vehicles") },
  });
  const customers = useList<Record<string, unknown>>({
    resource: "scm_customers",
    pagination: { mode: "server", currentPage: 1, pageSize: 500 },
    queryOptions: { retry: false, enabled: resources.includes("scm_customers") },
  });
  const categories = useList<Record<string, unknown>>({
    resource: "scm_vehicle_categories",
    pagination: { mode: "server", currentPage: 1, pageSize: 500 },
    queryOptions: {
      retry: false,
      enabled: resources.includes("scm_vehicle_categories"),
    },
  });
  const orders = useList<Record<string, unknown>>({
    resource: "scm_rental_orders",
    pagination: { mode: "server", currentPage: 1, pageSize: 500 },
    queryOptions: {
      retry: false,
      enabled: resources.includes("scm_rental_orders"),
    },
  });

  const sources: Record<string, typeof branches> = {
    scm_branches: branches,
    scm_vehicles: vehicles,
    scm_customers: customers,
    scm_vehicle_categories: categories,
    scm_rental_orders: orders,
  };

  const resourcesKey = resources.join(",");
  const branchesData = sources.scm_branches.result.data;
  const vehiclesData = sources.scm_vehicles.result.data;
  const customersData = sources.scm_customers.result.data;
  const categoriesData = sources.scm_vehicle_categories.result.data;
  const ordersData = sources.scm_rental_orders.result.data;

  return useMemo(() => {
    const map: Record<string, RelationOptions> = {};
    for (const resource of RELATION_RESOURCES) {
      if (!resources.includes(resource)) continue;
      const query = sources[resource];
      map[resource] = (query.result.data ?? []).map(
        (record: Record<string, unknown>) => ({
          value: String(record.id),
          label: String(
            record.name ?? record.plate_number ?? record.order_no ?? "?"
          ),
        })
      );
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resourcesKey,
    branchesData,
    vehiclesData,
    customersData,
    categoriesData,
    ordersData,
  ]);
}
