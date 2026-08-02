import { Navigate } from "react-router";

import {
  ArrowLeftRight,
  Ban,
  CircleGauge,
  TrendingUp,
} from "lucide-react";

import { carPortalRoles } from "@/lib/car/configs";
import { ProfitabilityPage } from "./profitability";
import { UtilizationPage } from "./utilization";
import { CancellationPage } from "./cancellation";
import { CashflowPage } from "./cashflow";

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
    element: <ProfitabilityPage />,
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
    element: <UtilizationPage />,
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
    element: <CancellationPage />,
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
    element: <CashflowPage />,
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
