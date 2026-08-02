import { useShow, useTranslate } from "@refinedev/core";
import { useLocation, useNavigate, useOutlet, useParams } from "react-router";
import { Pencil, RotateCw } from "lucide-react";
import { useMemo } from "react";

import { LoadingState } from "@/components/app-shell/loading-state";
import { EditButton } from "@/components/resources/buttons/edit";
import { RefreshButton } from "@/components/resources/buttons/refresh";
import {
  CarRelationValue,
  CarStatusBadge,
  formatDate,
  formatNumber,
} from "@/components/car/value";
import { CarRelatedPanels } from "@/components/car/car-related";
import { CarHistoryPanel } from "@/components/car/car-history";
import { CarAttachmentValue } from "@/components/car/car-attachment";
import {
  InlineNumberEdit,
  InlineSelectEdit,
} from "@/components/car/car-inline-edit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteDrawer } from "@/extensions/nocobase-route-surfaces";
import { useAIPageElementHandle } from "@/lib/car/ai";
import { resolveCarLabel } from "@/lib/car/labels";
import type { CarResourceConfig } from "@/lib/car/types";

export function CarResourceShow({
  config,
  id: idProp,
  closeTo: closeToProp,
}: {
  config: CarResourceConfig;
  id?: string;
  closeTo?: string;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: idParam } = useParams<{ id: string }>();
  const id = idProp ?? idParam;
  const nestedDrawer = useOutlet();
  const state = location.state as { returnTo?: string } | null | undefined;
  const closeTo = closeToProp ?? state?.returnTo ?? `/${config.name}`;

  const relationAppends = useMemo(() => {
    const fields = new Set<string>();
    for (const column of config.columns) {
      if (column.kind === "relation" && column.relation) {
        fields.add(column.accessor);
      }
      if (column.kind === "attachment") {
        fields.add(column.accessor);
      }
      for (const field of column.composite ?? []) {
        if (field.kind === "relation" && field.relation) {
          fields.add(field.accessor);
        }
      }
    }
    for (const field of config.fields) {
      if (field.kind === "attachment") {
        fields.add(field.name);
      }
    }
    return Array.from(fields);
  }, [config.columns, config.fields]);

  const { result: record, query } = useShow<Record<string, unknown>>({
    resource: config.name,
    id,
    meta: {
      appends: relationAppends,
    },
  });

  const title = useMemo(() => {
    if (!record) {
      return resolveCarLabel(config.titleKey, config.name, translate);
    }
    const firstColumn = config.columns[0];
    if (!firstColumn) {
      return String(record.id ?? "");
    }
    const raw = record[firstColumn.accessor];
    if (firstColumn.kind === "relation" && firstColumn.relation) {
      const related = raw as Record<string, unknown> | undefined;
      const label = related?.[firstColumn.relation.labelField];
      if (label !== null && label !== undefined && label !== "") {
        return String(label);
      }
    }
    if (firstColumn.composite?.length) {
      const primary = firstColumn.composite.find(
        (item) => item.priority === "primary"
      ) ?? firstColumn.composite[0];
      if (primary) {
        const primaryValue = record[primary.accessor];
        if (primaryValue !== null && primaryValue !== undefined) {
          return String(primaryValue);
        }
      }
    }
    if (raw !== null && raw !== undefined && raw !== "") {
      return String(raw);
    }
    return String(record.id ?? "");
  }, [record, config, translate]);

  const detailContext = useAIPageElementHandle({
    id: `${config.name}-detail-${id ?? "current"}`,
    title: `${resolveCarLabel(config.titleKey, config.name, translate)}: ${title}`,
    kind: "detail",
    getContext: () => ({
      resource: config.name,
      record: compactRecord(record ?? {}, config),
    }),
  });

  return (
    <RouteDrawer
      title={
        query.isLoading && !record ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          title
        )
      }
      description={translate(
        "car.drawer.show.description",
        { ns: "car" },
        "Review the record details."
      )}
      closeLabel={translate("buttons.close", "Close")}
      closeTo={closeTo}
      nested={nestedDrawer}
      className="lg:w-[56vw] lg:min-w-[48rem]"
      actions={
        record ? (
          <>
            <RefreshButton
              resource={config.name}
              recordItemId={String(record.id)}
              variant="outline"
              size="icon-sm"
              aria-label={translate("buttons.refresh", "Refresh")}
              title={translate("buttons.refresh", "Refresh")}
            >
              <RotateCw />
            </RefreshButton>
            <EditButton
              resource={config.name}
              recordItemId={String(record.id)}
              variant="outline"
              size="icon-sm"
              aria-label={translate(
                "car.actions.edit",
                { ns: "car" },
                "Edit"
              )}
              title={translate("car.actions.edit", { ns: "car" }, "Edit")}
              onClick={() => navigate("edit")}
            >
              <Pencil />
            </EditButton>
          </>
        ) : null
      }
    >
      <div
        ref={detailContext.ref}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
      >
        {query.isLoading ? (
          <LoadingState className="min-h-64" />
        ) : query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>
              {translate(
                "car.detail.loadError.title",
                { ns: "car" },
                "Unable to load record"
              )}
            </AlertTitle>
            <AlertDescription>
              {translate(
                "car.detail.loadError.description",
                { ns: "car" },
                "The record may no longer exist, or you may not have permission to view it."
              )}
            </AlertDescription>
          </Alert>
        ) : record ? (
          <div className="space-y-6">
            <DetailSections config={config} record={record} />
            {config.related?.length ? (
              <>
                <Separator />
                <CarRelatedPanels config={config} parentRecord={record} />
              </>
            ) : null}
            <Separator />
            <CarHistoryPanel config={config} record={record} />
          </div>
        ) : null}
      </div>
    </RouteDrawer>
  );
}

function DetailSections({
  config,
  record,
}: {
  config: CarResourceConfig;
  record: Record<string, unknown>;
}) {
  const translate = useTranslate();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <dl className="grid gap-4 sm:grid-cols-2">
          {config.fields.map((field) => {
            const value = record[field.name];
            const label = resolveCarLabel(field.title, field.title, translate);
            let rendered: string | null = null;

            if (field.kind === "select" && field.options) {
              return (
                <div key={field.name} className="space-y-1">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium break-words">
                    <InlineSelectEdit
                      resource={config.name}
                      recordId={String(record.id)}
                      fieldName={field.name}
                      fieldLabel={label}
                      value={value}
                      options={(field.options ?? []).map((option) => ({
                        value: option.value,
                        label: resolveCarLabel(option.label, option.label, translate),
                      }))}
                      display={
                        <CarStatusBadge
                          value={String(value ?? "")}
                          options={field.options}
                        />
                      }
                    />
                  </dd>
                </div>
              );
            }

            if (field.kind === "relation" && field.relation) {
              const related = value as Record<string, unknown> | undefined;
              return (
                <div key={field.name} className="space-y-1">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium break-words">
                    <CarRelationValue
                      value={related}
                      labelField={field.relation.labelField}
                      subFields={field.relation.subFields}
                    />
                  </dd>
                </div>
              );
            }

            if (field.kind === "attachment") {
              return (
                <div key={field.name} className="space-y-1">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium break-words">
                    <CarAttachmentValue
                      config={config}
                      fieldName={field.name}
                      record={record}
                    />
                  </dd>
                </div>
              );
            }

            if (field.kind === "number") {
              return (
                <div key={field.name} className="space-y-1">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium break-words">
                    <InlineNumberEdit
                      resource={config.name}
                      recordId={String(record.id)}
                      fieldName={field.name}
                      fieldLabel={label}
                      value={value}
                      display={
                        <span className="tabular-nums">
                          {typeof value === "number" ? formatNumber(value) : "-"}
                        </span>
                      }
                    />
                  </dd>
                </div>
              );
            }
            if (field.kind === "date") {
              rendered = formatDate(String(value ?? ""));
            } else if (field.kind === "datetime") {
              rendered = formatDate(String(value ?? ""), true);
            } else if (value === null || value === undefined || value === "") {
              rendered = "-";
            } else {
              rendered = String(value);
            }

            return (
              <div key={field.name} className="space-y-1">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium break-words">{rendered}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          {translate(
            "car.detail.timestamps",
            { ns: "car" },
            "Timestamps"
          )}
        </h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">
              {translate("car.fields.createdAt", { ns: "car" }, "Created at")}
            </dt>
            <dd className="text-sm font-medium break-words">
              {formatDate(String(record.createdAt ?? ""), true)}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">
              {translate("car.fields.updatedAt", { ns: "car" }, "Updated at")}
            </dt>
            <dd className="text-sm font-medium break-words">
              {formatDate(String(record.updatedAt ?? ""), true)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function compactRecord(
  record: Record<string, unknown>,
  config: CarResourceConfig
): Record<string, unknown> {
  const result: Record<string, unknown> = { id: record.id };
  for (const field of config.fields) {
    if (field.kind === "relation" && field.relation) {
      const related = record[field.name] as
        | Record<string, unknown>
        | undefined;
      result[field.name] = related?.[field.relation.labelField] ?? null;
    } else {
      result[field.name] = record[field.name] ?? null;
    }
  }
  return result;
}
