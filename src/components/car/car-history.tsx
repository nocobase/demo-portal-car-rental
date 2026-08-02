import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@refinedev/core";
import { History } from "lucide-react";
import { useMemo, useState } from "react";

import { nocobaseClient } from "@nocobase/portal-sdk/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { resolveCarLabel } from "@/lib/car/labels";
import { formatDate } from "@/components/car/value";
import type {
  CarResourceConfig,
  RelationOption,
} from "@/lib/car/types";

type RecordFieldHistory = {
  id: number;
  fieldPath: string;
  before: unknown;
  after: unknown;
  options?: {
    name?: string;
    type?: string;
    interface?: string;
    uiSchema?: { title?: string };
  };
};

type RecordHistory = {
  uuid: string;
  action: "create" | "update" | "destroy";
  createdAt: string;
  user?: { username?: string; nickname?: string; email?: string } | null;
  recordFieldHistory?: RecordFieldHistory[];
};

const useRecordHistory = (collectionName: string, recordId?: string) =>
  useQuery({
    queryKey: ["car", "history", collectionName, recordId],
    enabled: Boolean(recordId),
    queryFn: async () => {
      const response = await nocobaseClient.action<RecordHistory[]>(
        "recordHistories",
        "list",
        {
          method: "GET",
          query: {
            filter: JSON.stringify({
              collectionName: { $eq: collectionName },
              recordId: { $eq: recordId },
            }),
            sort: "-createdAt",
            pageSize: 100,
            appends: ["user", "recordFieldHistory"],
          },
        }
      );
      return Array.isArray(response) ? response : [];
    },
  });

// Map foreign-key field names (branchId) to their relation config so history
// values can be resolved to readable labels instead of raw IDs.
function buildRelationMap(
  config: Pick<CarResourceConfig, "fields"> | undefined
): Record<string, { relation: RelationOption; foreignKey: string }> {
  const map: Record<string, { relation: RelationOption; foreignKey: string }> =
    {};
  if (!config) return map;
  for (const field of config.fields) {
    if (field.kind === "relation" && field.relation) {
      map[`${field.name}Id`] = {
        relation: field.relation,
        foreignKey: field.name,
      };
      map[field.name] = {
        relation: field.relation,
        foreignKey: field.name,
      };
    }
  }
  return map;
}

export function CarHistoryPanel({
  config,
  record,
}: {
  config: CarResourceConfig;
  record: Record<string, unknown>;
}) {
  const translate = useTranslate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading } = useRecordHistory(
    config.name,
    record?.id ? String(record.id) : undefined
  );

  const relationMap = useMemo(() => buildRelationMap(config), [config]);

  // Collect all foreign-key values that appear in any field change.
  const relationIds = useMemo(() => {
    const byResource: Record<string, { relation: RelationOption; ids: Set<string> }> = {};
    for (const entry of data ?? []) {
      for (const change of entry.recordFieldHistory ?? []) {
        const resolved = relationMap[change.fieldPath];
        if (!resolved) continue;
        const resource = resolved.relation.resource;
        (byResource[resource] ??= {
          relation: resolved.relation,
          ids: new Set(),
        });
        for (const value of [change.before, change.after]) {
          if (value !== null && value !== undefined && value !== "") {
            byResource[resource].ids.add(String(value));
          }
        }
      }
    }
    return byResource;
  }, [data, relationMap]);

  const { data: relationOptionsMap } = useRelationLabels(relationIds);

  const title = resolveCarLabel(
    "car.history.title",
    "Update history",
    translate
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{title}</h3>
        {data && data.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {data.length}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          {translate(
            "car.history.empty",
            { ns: "car" },
            "No update history recorded yet."
          )}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <ul className="divide-y">
            {data.map((entry) => (
              <li key={entry.uuid}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  onClick={() =>
                    setExpanded((current) =>
                      current === entry.uuid ? null : entry.uuid
                    )
                  }
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ActionBadge action={entry.action} />
                    <span className="truncate text-xs text-muted-foreground">
                      {formatDate(entry.createdAt, true)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {resolveUserLabel(entry.user)}
                    </span>
                    {entry.recordFieldHistory?.length ? (
                      <span className="text-xs text-muted-foreground">
                        {entry.recordFieldHistory.length}
                      </span>
                    ) : null}
                  </div>
                </button>
                {expanded === entry.uuid && entry.recordFieldHistory?.length ? (
                  <FieldChanges
                    changes={entry.recordFieldHistory}
                    relationMap={relationMap}
                    relationLabels={relationOptionsMap ?? {}}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function useRelationLabels(
  byResource: Record<
    string,
    { relation: RelationOption; ids: Set<string> }
  >
) {
  const resources = Object.keys(byResource);
  const requestKey = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(
          resources.map((resource) => [
            resource,
            Array.from(byResource[resource].ids),
          ])
        )
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resources.join(",")]
  );

  return useQuery({
    queryKey: ["car", "history", "relation-labels", requestKey],
    enabled: resources.length > 0,
    queryFn: async () => {
      const result: Record<string, Record<string, string>> = {};
      await Promise.all(
        resources.map(async (resource) => {
          const { relation } = byResource[resource];
          const ids = Array.from(byResource[resource].ids);
          result[resource] = {};
          if (!ids.length) return;
          try {
            const rows = await nocobaseClient.action<Record<string, unknown>[]>(
              resource,
              "list",
              {
                method: "GET",
                query: {
                  filter: JSON.stringify({ id: { $in: ids } }),
                  pageSize: 200,
                },
              }
            );
            for (const record of Array.isArray(rows) ? rows : []) {
              result[resource][String(record.id)] = String(
                record[relation.labelField] ?? record.id ?? "?"
              );
            }
          } catch {
            // Leave unresolved ids as raw values.
          }
        })
      );
      return result;
    },
  });
}

function ActionBadge({ action }: { action: RecordHistory["action"] }) {
  const tone =
    action === "create"
      ? "text-emerald-600 dark:text-emerald-400"
      : action === "destroy"
        ? "text-red-600 dark:text-red-400"
        : "text-amber-600 dark:text-amber-400";
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-[11px] font-medium uppercase",
        tone
      )}
    >
      {action}
    </span>
  );
}

function FieldChanges({
  changes,
  relationMap,
  relationLabels,
}: {
  changes: RecordFieldHistory[];
  relationMap: Record<string, { relation: RelationOption; foreignKey: string }>;
  relationLabels: Record<string, Record<string, string>>;
}) {
  const translate = useTranslate();

  return (
    <div className="border-t bg-muted/30 px-3 py-2">
      <table className="w-full text-xs">
        <tbody>
          {changes.map((change) => {
            const resolved = relationMap[change.fieldPath];
            return (
              <tr key={change.id} className="border-b last:border-0">
                <td className="py-1 pr-3 align-top font-medium">
                  {resolveFieldLabel(change, translate)}
                </td>
                <td className="w-1/3 py-1 pr-3 align-top">
                  <ChangeValue
                    value={change.before}
                    muted
                    relationLabels={
                      resolved ? relationLabels[resolved.relation.resource] : undefined
                    }
                  />
                </td>
                <td className="w-1/3 py-1 align-top">
                  <ChangeValue
                    value={change.after}
                    relationLabels={
                      resolved ? relationLabels[resolved.relation.resource] : undefined
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChangeValue({
  value,
  muted,
  relationLabels,
}: {
  value: unknown;
  muted?: boolean;
  relationLabels?: Record<string, string>;
}) {
  const rendered = relationLabels
    ? relationLabels[String(value)] ?? renderValue(value)
    : renderValue(value);
  return (
    <span className={cn("break-words", muted ? "text-muted-foreground" : "font-medium")}>
      {rendered}
    </span>
  );
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length ? "…" : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function resolveUserLabel(
  user: RecordHistory["user"]
): string {
  if (!user) return "—";
  return user.nickname || user.username || user.email || "—";
}

function resolveFieldLabel(
  change: RecordFieldHistory,
  translate: ReturnType<typeof useTranslate>
): string {
  const fieldName = change.fieldPath || change.options?.name || "";
  const uiTitle = change.options?.uiSchema?.title;
  if (uiTitle) return uiTitle;
  return resolveCarLabel(`car.${fieldName}`, fieldName, translate);
}
