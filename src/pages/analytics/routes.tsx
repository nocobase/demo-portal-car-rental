import { Navigate } from "react-router";

import {
  ArrowLeftRight,
  Ban,
  CircleGauge,
  TrendingUp,
} from "lucide-react";

import { carPortalRoles } from "@/lib/car/configs";

export const analyticsGroupRoute = {
  name: "car-analytics",
  path: "/analytics",
  element: <Navigate to="/analytics/profitability" replace />,
  access: { roles: { anyOf: carPortalRoles } },
  resource: {
    meta: {
      label: "car.group.analytics",
      i18nKey: "car.group.analytics",
      i18nOptions: { ns: "car" },
      priority: 5,
      icon: <CircleGauge />,
      group: true,
      acl: { type: "authenticated" },
    },
  },
};

export const analyticsPageRoutes = [
  {
    name: "analytics-profitability",
    path: "/analytics/profitability",
    lazy: () =>
      import("./profitability").then((module) => ({
        default: module.ProfitabilityPage,
      })),
    access: { roles: { anyOf: carPortalRoles } },
    resource: {
      meta: {
        label: "car.analytics.profitability.title",
        i18nKey: "car.analytics.profitability.title",
        i18nOptions: { ns: "car" },
        descriptionI18nKey: "car.analytics.profitability.description",
        priority: 6,
        icon: <TrendingUp />,
        parent: "car-analytics",
        canCreate: false,
        canDelete: false,
        acl: { type: "authenticated" },
      },
    },
  },
  {
    name: "analytics-utilization",
    path: "/analytics/utilization",
    lazy: () =>
      import("./utilization").then((module) => ({
        default: module.UtilizationPage,
      })),
    access: { roles: { anyOf: carPortalRoles } },
    resource: {
      meta: {
        label: "car.analytics.utilization.title",
        i18nKey: "car.analytics.utilization.title",
        i18nOptions: { ns: "car" },
        descriptionI18nKey: "car.analytics.utilization.description",
        priority: 7,
        icon: <ArrowLeftRight />,
        parent: "car-analytics",
        canCreate: false,
        canDelete: false,
        acl: { type: "authenticated" },
      },
    },
  },
  {
    name: "analytics-cancellation",
    path: "/analytics/cancellation",
    lazy: () =>
      import("./cancellation").then((module) => ({
        default: module.CancellationPage,
      })),
    access: { roles: { anyOf: carPortalRoles } },
    resource: {
      meta: {
        label: "car.analytics.cancellation.title",
        i18nKey: "car.analytics.cancellation.title",
        i18nOptions: { ns: "car" },
        descriptionI18nKey: "car.analytics.cancellation.description",
        priority: 8,
        icon: <Ban />,
        parent: "car-analytics",
        canCreate: false,
        canDelete: false,
        acl: { type: "authenticated" },
      },
    },
  },
  {
    name: "analytics-cashflow",
    path: "/analytics/cashflow",
    lazy: () =>
      import("./cashflow").then((module) => ({
        default: module.CashflowPage,
      })),
    access: { roles: { anyOf: carPortalRoles } },
    resource: {
      meta: {
        label: "car.analytics.cashflow.title",
        i18nKey: "car.analytics.cashflow.title",
        i18nOptions: { ns: "car" },
        descriptionI18nKey: "car.analytics.cashflow.description",
        priority: 9,
        icon: <ArrowLeftRight />,
        parent: "car-analytics",
        canCreate: false,
        canDelete: false,
        acl: { type: "authenticated" },
      },
    },
  },
];
