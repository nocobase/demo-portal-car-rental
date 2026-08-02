import { useList, useTranslate } from "@refinedev/core";
import { ChevronDown, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode, type RefCallback } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  AIChatProvider,
  AIChatWindow,
  ChatInline,
  AIEmployeeShortcut,
  AIPageContextScope,
  useAI,
  useAIChatController,
  type AIEmployee,
  type AIEmployeeTask,
  type AIWorkContextItem,
} from "@/extensions/nocobase-ai";
import { pickBusinessAIEmployee, useAIPageElementHandle } from "@/lib/car/ai";
import { resolveCarLabel } from "@/lib/car/labels";
import type { CarResourceConfig } from "@/lib/car/types";

type AssistantRow = Record<string, unknown>;

const currentSeason = (date = new Date()): string => {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
};

const compactVehicles = (rows: AssistantRow[]) =>
  rows.map((vehicle) => ({
    id: vehicle.id,
    plate: vehicle.plate_number,
    brand: vehicle.brand,
    model: vehicle.model,
    daily_rate: vehicle.daily_rate,
    mileage: vehicle.mileage,
    status: vehicle.status,
    branch: (vehicle.branch as AssistantRow | undefined)?.name ?? null,
    category: (vehicle.category as AssistantRow | undefined)?.name ?? null,
  }));

const compactOrders = (rows: AssistantRow[]) =>
  rows.map((order) => ({
    id: order.id,
    order_no: order.order_no,
    status: order.status,
    pickup_time: order.pickup_time,
    expected_return: order.expected_return,
    actual_return: order.actual_return,
    daily_rate: order.daily_rate,
    total_amount: order.total_amount,
    vehicle: (order.vehicle as AssistantRow | undefined)?.plate_number ?? null,
    vehicle_brand: (order.vehicle as AssistantRow | undefined)?.brand ?? null,
    vehicle_model: (order.vehicle as AssistantRow | undefined)?.model ?? null,
    customer:
      (order.customer as AssistantRow | undefined)?.name ?? null,
    customer_phone:
      (order.customer as AssistantRow | undefined)?.phone ?? null,
  }));

const compactBranches = (rows: AssistantRow[]) =>
  rows.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    status: branch.status,
  }));

function DispatchAssistant({ config }: { config: CarResourceConfig }) {
  const translate = useTranslate();
  const { employees } = useAI();
  const controller = useAIChatController();
  const employee = useMemo(
    () => pickBusinessAIEmployee(employees),
    [employees]
  );

  const vehicles = useList<AssistantRow>({
    resource: "scm_vehicles",
    pagination: { mode: "server", currentPage: 1, pageSize: 300 },
    meta: { appends: ["branch", "category"] },
    queryOptions: { retry: false },
  });
  const branches = useList<AssistantRow>({
    resource: "scm_branches",
    pagination: { mode: "server", currentPage: 1, pageSize: 100 },
    queryOptions: { retry: false },
  });
  const orders = useList<AssistantRow>({
    resource: "scm_rental_orders",
    pagination: { mode: "server", currentPage: 1, pageSize: 300 },
    meta: { appends: ["vehicle", "customer"] },
    sorters: [{ field: "pickup_time", order: "asc" }],
    queryOptions: { retry: false },
  });

  const contextHandle = useAIPageElementHandle({
    id: "dispatch-ai-assistant",
    title: resolveCarLabel(config.aiAssistant!.titleKey, config.name, translate),
    kind: "detail",
    getContext: () => ({
      resource: "scm_dispatch",
      date: new Date().toISOString().slice(0, 10),
      branches: compactBranches(branches.result.data ?? []),
      vehicles: compactVehicles(vehicles.result.data ?? []),
      orders: compactOrders(orders.result.data ?? []),
    }),
  });

  const tasks = useMemo<AIEmployeeTask[]>(
    () => [
      {
        title: translate(
          "car.ai.dispatch.task.available",
          { ns: "car" },
          "Which vehicles are available today?"
        ),
        message: {
          user: translate(
            "car.ai.dispatch.task.available.message",
            { ns: "car" },
            "Which vehicles are available today? Answer using the current fleet status and rental order calendar, and list the available vehicles by branch."
          ),
        },
        autoSend: true,
      },
      {
        title: translate(
          "car.ai.dispatch.task.move",
          { ns: "car" },
          "Evaluate a cross-branch dispatch"
        ),
        message: {
          user: translate(
            "car.ai.dispatch.task.move.message",
            { ns: "car" },
            "Evaluate whether a vehicle can be moved from the Chaoyang flagship store to the Haidian tech store. Consider the vehicle's current status, order occupancy, and the target store's demand, and give a conclusion and recommendation."
          ),
        },
        autoSend: false,
      },
    ],
    [translate]
  );

  return (
    <AssistantPanelShell
      config={config}
      employee={employee}
      controller={controller}
      contextHandle={contextHandle}
      tasks={tasks}
    />
  );
}

function ContractAssistant({ config }: { config: CarResourceConfig }) {
  const translate = useTranslate();
  const { employees } = useAI();
  const controller = useAIChatController();
  const employee = useMemo(
    () => pickBusinessAIEmployee(employees),
    [employees]
  );

  const orders = useList<AssistantRow>({
    resource: "scm_rental_orders",
    pagination: { mode: "server", currentPage: 1, pageSize: 200 },
    meta: { appends: ["vehicle", "customer"] },
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { retry: false },
  });

  const contextHandle = useAIPageElementHandle({
    id: "contract-ai-assistant",
    title: resolveCarLabel(config.aiAssistant!.titleKey, config.name, translate),
    kind: "detail",
    getContext: () => ({
      resource: "scm_contracts",
      orders: compactOrders(orders.result.data ?? []),
    }),
  });

  const tasks = useMemo<AIEmployeeTask[]>(
    () => [
      {
        title: translate(
          "car.ai.contract.task.draft",
          { ns: "car" },
          "Draft contract content"
        ),
        message: {
          user: translate(
            "car.ai.contract.task.draft.message",
            { ns: "car" },
            "Using the most recent rental order, draft the full text of a car rental contract, including the parties, vehicle, rental period, fees, deposit, and breach-of-contract liability clauses."
          ),
        },
        autoSend: false,
      },
      {
        title: translate(
          "car.ai.contract.task.breach",
          { ns: "car" },
          "Draft breach / overdue notice"
        ),
        message: {
          user: translate(
            "car.ai.contract.task.breach.message",
            { ns: "car" },
            "Draft a formal notice for a customer whose return is overdue or who has breached the contract, based on the order's rental period and current status."
          ),
        },
        autoSend: false,
      },
    ],
    [translate]
  );

  return (
    <AssistantPanelShell
      config={config}
      employee={employee}
      controller={controller}
      contextHandle={contextHandle}
      tasks={tasks}
    />
  );
}

function PricingAssistant({ config }: { config: CarResourceConfig }) {
  const translate = useTranslate();
  const { employees } = useAI();
  const controller = useAIChatController();
  const employee = useMemo(
    () => pickBusinessAIEmployee(employees),
    [employees]
  );

  const vehicles = useList<AssistantRow>({
    resource: "scm_vehicles",
    pagination: { mode: "server", currentPage: 1, pageSize: 300 },
    meta: { appends: ["branch", "category"] },
    queryOptions: { retry: false },
  });
  const categories = useList<AssistantRow>({
    resource: "scm_vehicle_categories",
    pagination: { mode: "server", currentPage: 1, pageSize: 100 },
    queryOptions: { retry: false },
  });
  const orders = useList<AssistantRow>({
    resource: "scm_rental_orders",
    pagination: { mode: "server", currentPage: 1, pageSize: 500 },
    queryOptions: { retry: false },
  });

  const contextHandle = useAIPageElementHandle({
    id: "pricing-ai-assistant",
    title: resolveCarLabel(config.aiAssistant!.titleKey, config.name, translate),
    kind: "detail",
    getContext: () => {
      const orderCountByVehicle = new Map<string | number, number>();
      for (const order of orders.result.data ?? []) {
        const relatedVehicle = order.vehicle as AssistantRow | undefined;
        const vehicleId =
          (order.vehicleId as string | number | undefined) ??
          (relatedVehicle?.id as string | number | undefined);
        if (vehicleId === undefined || vehicleId === null) continue;
        orderCountByVehicle.set(
          vehicleId,
          (orderCountByVehicle.get(vehicleId) ?? 0) + 1
        );
      }
      return {
        resource: "scm_vehicles",
        season: currentSeason(),
        categories: (categories.result.data ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          base_daily_rate: category.base_daily_rate,
        })),
        vehicles: compactVehicles(vehicles.result.data ?? []).map((vehicle) => ({
          ...vehicle,
          order_count: orderCountByVehicle.get(vehicle.id as never) ?? 0,
        })),
      };
    },
  });

  const tasks = useMemo<AIEmployeeTask[]>(
    () => [
      {
        title: translate(
          "car.ai.pricing.task.rate",
          { ns: "car" },
          "Suggest daily rates"
        ),
        message: {
          user: translate(
            "car.ai.pricing.task.rate.message",
            { ns: "car" },
            "Considering the current season, vehicle model, and utilization, suggest a daily rate for each model and briefly explain the reasoning."
          ),
        },
        autoSend: false,
      },
      {
        title: translate(
          "car.ai.pricing.task.optimize",
          { ns: "car" },
          "Analyze rate / promotion opportunities"
        ),
        message: {
          user: translate(
            "car.ai.pricing.task.optimize.message",
            { ns: "car" },
            "Analyze which models have high or low utilization and suggest price increases, promotions, or adjustments."
          ),
        },
        autoSend: false,
      },
    ],
    [translate]
  );

  return (
    <AssistantPanelShell
      config={config}
      employee={employee}
      controller={controller}
      contextHandle={contextHandle}
      tasks={tasks}
    />
  );
}

function AssistantPanelShell({
  config,
  employee,
  controller,
  contextHandle,
  tasks,
}: {
  config: CarResourceConfig;
  employee?: AIEmployee;
  controller: ReturnType<typeof useAIChatController>;
  contextHandle: {
    ref: RefCallback<HTMLElement>;
    context: AIWorkContextItem;
  };
  tasks: AIEmployeeTask[];
}) {
  const translate = useTranslate();
  const title = resolveCarLabel(
    config.aiAssistant!.titleKey,
    config.name,
    translate
  );
  const description = resolveCarLabel(
    config.aiAssistant!.descriptionKey,
    "",
    translate
  );
  const [open, setOpen] = useState(false);

  if (!employee) {
    return (
      <Card className="gap-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-sm text-muted-foreground">
          {translate(
            "car.dashboard.ai.unavailable",
            { ns: "car" },
            "AI assistant is not available because no AI employee is configured."
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <AIPageContextScope context={contextHandle.context}>
      <AIChatProvider
        id={`${config.name}-ai-assistant`}
        controller={controller}
        defaultEmployee={employee.username}
      >
        <Card ref={contextHandle.ref} className="gap-0 overflow-hidden">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 py-3.5">
              <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition-colors hover:bg-accent/40">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {title}
                    <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {translate("car.ai.collapsed", { ns: "car" }, "点击展开")}
                    </span>
                  </CardTitle>
                  <CardDescription className="truncate text-xs">
                    {description}
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn(
                    "mr-2 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    open && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <AIEmployeeShortcut
                aiEmployee={employee.username}
                target={controller}
                tasks={tasks}
                label={translate("car.ai.ask", { ns: "car" }, "Ask assistant")}
                size={32}
                onTrigger={() => setOpen(true)}
              />
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="p-0">
                <div className="h-[440px] min-h-0 border-t">
                  <ChatInline className="h-full min-h-0 border-0 rounded-none">
                    <AIChatWindow
                      showConversationToggle={false}
                      disclaimer={false}
                    />
                  </ChatInline>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </AIChatProvider>
    </AIPageContextScope>
  );
}

export function CarAIAssistantPanel({
  config,
}: {
  config: CarResourceConfig;
}): ReactNode | null {
  const kind = config.aiAssistant?.kind;
  if (kind === "scm_dispatch") return <DispatchAssistant config={config} />;
  if (kind === "contract") return <ContractAssistant config={config} />;
  if (kind === "pricing") return <PricingAssistant config={config} />;
  return null;
}
