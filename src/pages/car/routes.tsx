import { CalendarRange, ConciergeBell, ShieldAlert } from "lucide-react";
import { Navigate } from "react-router";

import {
  resourceConfigs,
  carMenuGroups,
  carPortalRoles,
} from "@/lib/car/configs";
import type {
  CarRelatedConfig,
  CarResourceConfig,
} from "@/lib/car/types";

const GroupRedirect = ({ to }: { to: string }) => <Navigate to={to} replace />;

const lazyCarListPage = (config: CarResourceConfig) => async () => {
  const { CarListPage } = await import("./route-components");
  return {
    default: function CarListRoute() {
      return <CarListPage config={config} />;
    },
  };
};

const lazyCarCreatePage = (config: CarResourceConfig) => async () => {
  const { CarCreatePage } = await import("./route-components");
  return {
    default: function CarCreateRoute() {
      return <CarCreatePage config={config} />;
    },
  };
};

const lazyCarEditPage = (config: CarResourceConfig) => async () => {
  const { CarEditPage } = await import("./route-components");
  return {
    default: function CarEditRoute() {
      return <CarEditPage config={config} />;
    },
  };
};

const lazyCarShowPage = (config: CarResourceConfig) => async () => {
  const { CarShowPage } = await import("./route-components");
  return {
    default: function CarShowRoute() {
      return <CarShowPage config={config} />;
    },
  };
};

const lazyCarRelatedCreatePage = (
  config: CarResourceConfig,
  related: CarRelatedConfig
) => async () => {
  const { CarRelatedCreatePage } = await import("./route-components");
  return {
    default: function CarRelatedCreateRoute() {
      return <CarRelatedCreatePage config={config} related={related} />;
    },
  };
};

const lazyCarRelatedEditPage = (
  config: CarResourceConfig,
  related: CarRelatedConfig
) => async () => {
  const { CarRelatedEditPage } = await import("./route-components");
  return {
    default: function CarRelatedEditRoute() {
      return <CarRelatedEditPage config={config} related={related} />;
    },
  };
};

const lazyCarRelatedShowPage = (
  config: CarResourceConfig,
  related: CarRelatedConfig
) => async () => {
  const { CarRelatedShowPage } = await import("./route-components");
  return {
    default: function CarRelatedShowRoute() {
      return <CarRelatedShowPage config={config} related={related} />;
    },
  };
};

const lazyCarRelatedShowEditPage = (
  config: CarResourceConfig,
  related: CarRelatedConfig
) => async () => {
  const { CarRelatedShowEditPage } = await import("./route-components");
  return {
    default: function CarRelatedShowEditRoute() {
      return <CarRelatedShowEditPage config={config} related={related} />;
    },
  };
};

export const dashboardRoute = {
  name: "dashboard",
  path: "/dashboard",
  lazy: () =>
    import("@/pages/dashboard").then((module) => ({
      default: module.DashboardPage,
    })),
  access: { roles: { anyOf: carPortalRoles } },
  resource: {
    meta: {
      label: "car.dashboard.title",
      i18nKey: "car.dashboard.title",
      i18nOptions: { ns: "car" },
      priority: 1,
      icon: null,
      descriptionI18nKey: "car.dashboard.description",
      canCreate: false,
      acl: { type: "authenticated" },
    },
  },
};

// Operational surfaces that are not a single collection's CRUD: the counter's
// day, the vehicle × date availability board and the expiry queue.
export const carOperationRoutes = [
  {
    name: "rental-desk",
    path: "/rental-desk",
    lazy: () =>
      import("./rental-desk").then((module) => ({
        default: module.RentalDeskPage,
      })),
    access: { roles: { anyOf: carPortalRoles } },
    resource: {
      meta: {
        label: "car.desk.title",
        i18nKey: "car.desk.title",
        i18nOptions: { ns: "car" },
        descriptionI18nKey: "car.desk.description",
        priority: 2,
        icon: <ConciergeBell />,
        canCreate: false,
        canDelete: false,
        acl: { type: "authenticated" },
      },
    },
  },
  {
    name: "fleet-schedule",
    path: "/fleet-schedule",
    lazy: () =>
      import("./schedule").then((module) => ({
        default: module.FleetSchedulePage,
      })),
    access: { roles: { anyOf: carPortalRoles } },
    resource: {
      meta: {
        label: "car.schedule.title",
        i18nKey: "car.schedule.title",
        i18nOptions: { ns: "car" },
        descriptionI18nKey: "car.schedule.description",
        priority: 3,
        icon: <CalendarRange />,
        canCreate: false,
        canDelete: false,
        acl: { type: "authenticated" },
      },
    },
  },
  {
    name: "compliance",
    path: "/compliance",
    lazy: () =>
      import("./compliance").then((module) => ({
        default: module.CompliancePage,
      })),
    access: { roles: { anyOf: carPortalRoles } },
    resource: {
      meta: {
        label: "car.compliance.title",
        i18nKey: "car.compliance.title",
        i18nOptions: { ns: "car" },
        descriptionI18nKey: "car.compliance.description",
        priority: 4,
        icon: <ShieldAlert />,
        canCreate: false,
        canDelete: false,
        acl: { type: "authenticated" },
      },
    },
  },
  // The vehicle ledger is reached from the fleet list and the schedule board,
  // so it owns a route but never a menu entry.
  {
    name: "vehicle-profile",
    path: "/scm_vehicles/profile/:id",
    lazy: () =>
      import("./vehicle-profile").then((module) => ({
        default: module.VehicleProfilePage,
      })),
    access: { roles: { anyOf: carPortalRoles } },
  },
];

export const carGroupRoutes = carMenuGroups.map((group) => ({
  name: group.name,
  path: `/${group.name}`,
  element: <GroupRedirect to={`/${group.resources[0]}`} />,
  resource: {
    meta: {
      label: group.titleKey,
      i18nKey: group.titleKey,
      i18nOptions: { ns: "car" },
      priority: group.priority,
      icon: group.icon,
      group: true,
      acl: { type: "authenticated" },
    },
  },
}));

export const carResourceRoutes = resourceConfigs.map((config) => ({
  name: config.name,
  path: `/${config.name}`,
  lazy: lazyCarListPage(config),
  resource: {
    meta: {
      label: config.titleKey,
      i18nKey: config.titleKey,
      i18nOptions: { ns: "car" },
      descriptionI18nKey: config.descriptionKey,
      priority: config.priority,
      icon: config.icon,
      parent: config.group,
      canCreate: config.canCreate !== false,
      canDelete: config.canDelete !== false,
      acl: { type: "collection" },
    },
  },
  children: [
    {
      name: `${config.name}.create`,
      path: "create",
      resourceAction: "create" as const,
      lazy: lazyCarCreatePage(config),
    },
    {
      name: `${config.name}.edit`,
      path: "edit/:id",
      resourceAction: "edit" as const,
      lazy: lazyCarEditPage(config),
    },
    {
      name: `${config.name}.show`,
      path: "show/:id",
      resourceAction: "show" as const,
      lazy: lazyCarShowPage(config),
      children: [
        {
          name: `${config.name}.show.edit`,
          path: "edit",
          lazy: lazyCarEditPage(config),
        },
        ...(config.related ?? []).flatMap((related) => [
          {
            name: `${config.name}.show.${related.resource}.create`,
            path: `${related.resource}/create`,
            lazy: lazyCarRelatedCreatePage(config, related),
          },
          {
            name: `${config.name}.show.${related.resource}.edit`,
            path: `${related.resource}/edit/:rid`,
            lazy: lazyCarRelatedEditPage(config, related),
          },
          {
            name: `${config.name}.show.${related.resource}.show`,
            path: `${related.resource}/show/:rid`,
            lazy: lazyCarRelatedShowPage(config, related),
            children: [
              {
                name: `${config.name}.show.${related.resource}.show.edit`,
                path: "edit",
                lazy: lazyCarRelatedShowEditPage(config, related),
              },
            ],
          },
        ]),
      ],
    },
  ],
}));
