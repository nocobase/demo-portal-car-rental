import { resolveRouteSurfaceCloseTo } from "@nocobase/portal-sdk/routing";
import { useLocation, useParams } from "react-router";

import { AccessDenied } from "@/components/access-control/access-denied";
import { CanAccess } from "@/components/access-control/can-access";
import { CarResourceList } from "@/components/car/car-list";
import { CarResourceCreate, CarResourceEdit } from "@/components/car/car-form";
import { CarResourceShow } from "@/components/car/car-show";
import { resourceMap } from "@/lib/car/configs";
import type { CarRelatedConfig, CarResourceConfig } from "@/lib/car/types";

export function CarListPage({ config }: { config: CarResourceConfig }) {
  return (
    <CanAccess
      resource={config.name}
      action="list"
      fallback={<AccessDenied />}
    >
      <CarResourceList key={`list-${config.name}`} config={config} />
    </CanAccess>
  );
}

export function CarCreatePage({ config }: { config: CarResourceConfig }) {
  return (
    <CanAccess
      resource={config.name}
      action="create"
      fallback={<AccessDenied />}
    >
      <CarResourceCreate config={config} />
    </CanAccess>
  );
}

export function CarEditPage({ config }: { config: CarResourceConfig }) {
  return (
    <CanAccess
      resource={config.name}
      action="update"
      fallback={<AccessDenied />}
    >
      <CarResourceEdit config={config} />
    </CanAccess>
  );
}

export function CarShowPage({ config }: { config: CarResourceConfig }) {
  return (
    <CanAccess
      resource={config.name}
      action="view"
      fallback={<AccessDenied />}
    >
      <CarResourceShow config={config} />
    </CanAccess>
  );
}

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

export function CarRelatedShowPage({
  config,
  related,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
}) {
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
}

export function CarRelatedEditPage({
  config,
  related,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
}) {
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
}

// Edit hosted under a related record's show drawer. Closing returns to the
// related show surface (the route that hosts this nested editor).
export function CarRelatedShowEditPage({
  config,
  related,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
}) {
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
}

export function CarRelatedCreatePage({
  config,
  related,
}: {
  config: CarResourceConfig;
  related: CarRelatedConfig;
}) {
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
}
