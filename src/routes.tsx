import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import {
  dashboardRoute,
  carGroupRoutes,
  carResourceRoutes,
} from "@/pages/car/routes";
import {
  analyticsGroupRoute,
  analyticsPageRoutes,
} from "@/pages/analytics/routes";

// Registry demo routes are replaced by the real car-rental application.
export const registryRoutesEnabled = false;

export const appRoutes = defineAppRoutes([
  dashboardRoute,
  analyticsGroupRoute,
  ...analyticsPageRoutes,
  ...carGroupRoutes,
  ...carResourceRoutes,
]);
