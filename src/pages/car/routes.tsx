import { resolveRouteSurfaceCloseTo } from "@nocobase/portal-sdk/routing";
import { useLocation, useParams, Navigate } from "react-router";

import { AccessDenied } from "@/components/access-control/access-denied";
import { CanAccess } from "@/components/access-control/can-access";
import { CarResourceList } from "@/components/car/car-list";
import { CarResourceCreate, CarResourceEdit } from "@/components/car/car-form";
import { CarResourceShow } from "@/components/car/car-show";
import { DashboardPage } from "@/pages/dashboard";
import {
  resourceConfigs,
  carMenuGroups,
  resourceMap,
  carPortalRoles,
} from "@/lib/car/configs";
import type {
  CarRelatedConfig,
  CarResourceConfig,
} from "@/lib/car/types";

const GroupRedirect = ({ to }: { to: string }) => <Navigate to={to} replace />;

const CarListPage = ({ config }: { config: CarResourceConfig }) => (
  <CanAccess
    resource={config.name}
    action="list"
    fallback={<AccessDenied />}
  >
    <CarResourceList key={`list-${config.name}`} config={config} />
  </CanAccess>
);

const CarCreatePage = ({ config }: { config: CarResourceConfig }) => (
  <CanAccess
    resource={config.name}
    action="create"
    fallback={<AccessDenied />}
  >
    <CarResourceCreate config={config} />
  </CanAccess>
);

const CarEditPage = ({ config }: { config: CarResourceConfig }) => (
  <CanAccess
    resource={config.name}
    action="update"
    fallback={<AccessDenied />}
  >
    <CarResourceEdit config={config} />
  </CanAccess>
);

const CarShowPage = ({ config }: { config: CarResourceConfig }) => (
  <CanAccess
    resource={config.name}
    action="view"
    fallback={<AccessDenied />}
  >
    <CarResourceShow config={config} />
  </CanAccess>
);

// Related-content surfaces stay under the host show page as contextual child
// routes. Their close target resolves from the SDK navigation state (which
// preserves the complete opening URL) or falls back to the host show URL.
const hostShowUrl = (config: CarResourceConfig, id?: string) =>
  `/${config.name}/show/${id ?? ""}`;

function useRelatedCloseTo(config: CarResourceConfig) {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  return resolveRouteSurfaceCloseTo(location.state, {
    pathname: hostShowUrl(config, id),
  });
}

const CarRelatedShowPage = ({
  config,
  related,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
}) => {
  const relatedConfig = resourceMap.get(related.resource);
  const { rid } = useParams<{ rid: string }>();
  if (!relatedConfig) return null;
  return (
    <CanAccess
      resource={related.resource}
      action="view"
      fallback={<AccessDenied />}
    >
      <CarResourceShow
        config={relatedConfig}
        id={rid}
        closeTo={useRelatedCloseTo(config)}
      />
    </CanAccess>
  );
};

const CarRelatedEditPage = ({
  config,
  related,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
}) => {
  const relatedConfig = resourceMap.get(related.resource);
  const { rid } = useParams<{ rid: string }>();
  if (!relatedConfig) return null;
  return (
    <CanAccess
      resource={related.resource}
      action="update"
      fallback={<AccessDenied />}
    >
      <CarResourceEdit
        config={relatedConfig}
        id={rid}
        closeTo={useRelatedCloseTo(config)}
      />
    </CanAccess>
  );
};

// Edit hosted under a related record's show drawer. Closing returns to the
// related show surface (the route that hosts this nested editor).
const CarRelatedShowEditPage = ({
  config,
  related,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
}) => {
  const relatedConfig = resourceMap.get(related.resource);
  const { id, rid } = useParams<{ id: string; rid: string }>();
  if (!relatedConfig) return null;
  return (
    <CanAccess
      resource={related.resource}
      action="update"
      fallback={<AccessDenied />}
    >
      <CarResourceEdit
        config={relatedConfig}
        id={rid}
        closeTo={`/${config.name}/show/${id}/${related.resource}/show/${rid}`}
      />
    </CanAccess>
  );
};

const CarRelatedCreatePage = ({
  config,
  related,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
}) => {
  const relatedConfig = resourceMap.get(related.resource);
  const { id } = useParams<{ id: string }>();
  if (!relatedConfig) return null;
  return (
    <CanAccess
      resource={related.resource}
      action="create"
      fallback={<AccessDenied />}
    >
      <CarResourceCreate
        config={relatedConfig}
        closeTo={useRelatedCloseTo(config)}
        initialValues={{
          [related.filterField.replace(/Id$/, "")]: id,
        }}
      />
    </CanAccess>
  );
};

export const dashboardRoute = {
  name: "dashboard",
  path: "/dashboard",
  element: <DashboardPage />,
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
  element: <CarListPage config={config} />,
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
      element: <CarCreatePage config={config} />,
    },
    {
      name: `${config.name}.edit`,
      path: "edit/:id",
      resourceAction: "edit" as const,
      element: <CarEditPage config={config} />,
    },
    {
      name: `${config.name}.show`,
      path: "show/:id",
      resourceAction: "show" as const,
      element: <CarShowPage config={config} />,
      children: [
        {
          name: `${config.name}.show.edit`,
          path: "edit",
          element: <CarEditPage config={config} />,
        },
        ...(config.related ?? []).flatMap((related) => [
          {
            name: `${config.name}.show.${related.resource}.create`,
            path: `${related.resource}/create`,
            element: (
              <CarRelatedCreatePage config={config} related={related} />
            ),
          },
          {
            name: `${config.name}.show.${related.resource}.edit`,
            path: `${related.resource}/edit/:rid`,
            element: <CarRelatedEditPage config={config} related={related} />,
          },
          {
            name: `${config.name}.show.${related.resource}.show`,
            path: `${related.resource}/show/:rid`,
            element: <CarRelatedShowPage config={config} related={related} />,
            children: [
              {
                name: `${config.name}.show.${related.resource}.show.edit`,
                path: "edit",
                element: (
                  <CarRelatedShowEditPage config={config} related={related} />
                ),
              },
            ],
          },
        ]),
      ],
    },
  ],
}));
