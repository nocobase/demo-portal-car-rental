import {
  BarChart3,
  Building2,
  Car,
  CarTaxiFront,
  CircleGauge,
  FileText,
  Gauge,
  HandCoins,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Tags,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";

import type { CarResourceConfig } from "./types";

const vehicleStatusOptions = [
  { value: "available", label: "car.vehicle.status.available" },
  { value: "rented", label: "car.vehicle.status.rented" },
  { value: "maintenance", label: "car.vehicle.status.maintenance" },
  { value: "retired", label: "car.vehicle.status.retired" },
  { value: "scrapped", label: "car.vehicle.status.scrapped" },
];

const orderStatusOptions = [
  { value: "reserved", label: "car.order.status.reserved" },
  { value: "ongoing", label: "car.order.status.ongoing" },
  { value: "completed", label: "car.order.status.completed" },
  { value: "cancelled", label: "car.order.status.cancelled" },
];

const paymentStatusOptions = [
  { value: "pending", label: "car.payment.status.pending" },
  { value: "paid", label: "car.payment.status.paid" },
  { value: "refunded", label: "car.payment.status.refunded" },
];

const violationStatusOptions = [
  { value: "pending", label: "car.violation.status.pending" },
  { value: "processing", label: "car.violation.status.processing" },
  { value: "appealing", label: "car.violation.status.appealing" },
  { value: "processed", label: "car.violation.status.processed" },
  { value: "resolved", label: "car.violation.status.resolved" },
];

const dispatchStatusOptions = [
  { value: "pending", label: "car.dispatch.status.pending" },
  { value: "in_transit", label: "car.dispatch.status.in_transit" },
  { value: "completed", label: "car.dispatch.status.completed" },
];

const branchStatusOptions = [
  { value: "open", label: "car.branch.status.open" },
  { value: "renovating", label: "car.branch.status.renovating" },
  { value: "closed", label: "car.branch.status.closed" },
];

const customerStatusOptions = [
  { value: "lead", label: "car.customer.status.lead" },
  { value: "active", label: "car.customer.status.active" },
  { value: "churned", label: "car.customer.status.churned" },
  { value: "blocked", label: "car.customer.status.blocked" },
];

const customerTypeOptions = [
  { value: "personal", label: "car.customer.type.personal" },
  { value: "corporate", label: "car.customer.type.corporate" },
];

const creditLevelOptions = [
  { value: "high", label: "car.customer.credit_level.high" },
  { value: "medium", label: "car.customer.credit_level.medium" },
  { value: "low", label: "car.customer.credit_level.low" },
];

const contractStatusOptions = [
  { value: "draft", label: "car.contract.status.draft" },
  { value: "signed", label: "car.contract.status.signed" },
  { value: "active", label: "car.contract.status.active" },
  { value: "completed", label: "car.contract.status.completed" },
  { value: "archived", label: "car.contract.status.archived" },
  { value: "void", label: "car.contract.status.void" },
];

const maintenanceTypeOptions = [
  { value: "service", label: "car.maintenance.type.service" },
  { value: "maintenance", label: "car.maintenance.type.maintenance" },
  { value: "repair", label: "car.maintenance.type.repair" },
  { value: "inspection", label: "car.maintenance.type.inspection" },
];

const insuranceTypeOptions = [
  { value: "compulsory", label: "car.insurance.type.compulsory" },
  { value: "commercial", label: "car.insurance.type.commercial" },
  { value: "third_party", label: "car.insurance.type.third_party" },
];

const paymentMethodOptions = [
  { value: "cash", label: "car.payment.method.cash" },
  { value: "card", label: "car.payment.method.card" },
  { value: "alipay", label: "car.payment.method.alipay" },
  { value: "wechat", label: "car.payment.method.wechat" },
];

const staffRoleOptions = [
  { value: "admin", label: "car.staff.role.admin" },
  { value: "manager", label: "car.staff.role.manager" },
  { value: "agent", label: "car.staff.role.agent" },
];

const todoKindOptions = [
  { value: "overdue_return", label: "car.todo.kind.overdue_return" },
  { value: "insurance", label: "car.todo.kind.insurance" },
  { value: "inspection", label: "car.todo.kind.inspection" },
  { value: "maintenance", label: "car.todo.kind.maintenance" },
  { value: "license", label: "car.todo.kind.license" },
];

const todoStatusOptions = [
  { value: "open", label: "car.todo.status.open" },
  { value: "done", label: "car.todo.status.done" },
];

const todoSourceTypeOptions = [
  { value: "order", label: "car.todo.source_type.order" },
  { value: "vehicle", label: "car.todo.source_type.vehicle" },
  { value: "insurance", label: "car.todo.source_type.insurance" },
  { value: "maintenance", label: "car.todo.source_type.maintenance" },
  { value: "system", label: "car.todo.source_type.system" },
];

export const cancelReasonOptions = [
  { value: "schedule_conflict", label: "car.order.cancel_reason.schedule_conflict" },
  { value: "price_change", label: "car.order.cancel_reason.price_change" },
  { value: "change_plan", label: "car.order.cancel_reason.change_plan" },
  { value: "vehicle_unavailable", label: "car.order.cancel_reason.vehicle_unavailable" },
  { value: "customer_request", label: "car.order.cancel_reason.customer_request" },
  { value: "other", label: "car.order.cancel_reason.other" },
];

export const dashboardConfig = {
  name: "dashboard",
  titleKey: "car.dashboard.title",
  descriptionKey: "car.dashboard.description",
  icon: <LayoutDashboard />,
  priority: 1,
};

export const carPortalRoles = [
  "r_car_admin",
  "r_front_desk",
  "r_fleet_operator",
  "r_finance",
  "r_viewer",
];

export type CarMenuGroup = {
  name: string;
  titleKey: string;
  icon: ReactNode;
  priority: number;
  resources: string[];
};

export const carMenuGroups: CarMenuGroup[] = [
  {
    name: "car-fleet",
    titleKey: "car.group.fleet",
    icon: <Car />,
    priority: 10,
    resources: ["scm_vehicles", "scm_vehicle_categories", "scm_insurance", "scm_maintenance", "scm_dispatch", "scm_violations"],
  },
  {
    name: "car-customers",
    titleKey: "car.group.customers",
    icon: <Users />,
    priority: 20,
    resources: ["scm_customers"],
  },
  {
    name: "car-rental",
    titleKey: "car.group.rental",
    icon: <CarTaxiFront />,
    priority: 30,
    resources: ["scm_rental_orders", "scm_contracts", "scm_car_todos"],
  },
  {
    name: "car-finance",
    titleKey: "car.group.finance",
    icon: <WalletCards />,
    priority: 40,
    resources: ["scm_payments"],
  },
  {
    name: "car-base",
    titleKey: "car.group.base",
    icon: <Building2 />,
    priority: 50,
    resources: ["scm_branches", "scm_suppliers", "scm_staff"],
  },
];

export const resourceConfigs: CarResourceConfig[] = [
  {
    name: "scm_vehicles",
    titleKey: "car.vehicle.title",
    descriptionKey: "car.vehicle.description",
    icon: <Car />,
    priority: 11,
    group: "car-fleet",
    canCreate: true,
    canDelete: true,
    searchableFields: ["brand", "model", "plate_number"],
    aiAssistant: {
      kind: "pricing",
      titleKey: "car.vehicle.ai.title",
      descriptionKey: "car.vehicle.ai.description",
    },
    fields: [
      { name: "brand", title: "car.vehicle.brand", kind: "text", required: true },
      { name: "model", title: "car.vehicle.model", kind: "text", required: true },
      { name: "plate_number", title: "car.vehicle.plate_number", kind: "text", required: true },
      { name: "color", title: "car.vehicle.color", kind: "text" },
      { name: "daily_rate", title: "car.vehicle.daily_rate", kind: "number" },
      { name: "mileage", title: "car.vehicle.mileage", kind: "number" },
      { name: "status", title: "car.vehicle.status.label", kind: "select", options: vehicleStatusOptions },
      {
        name: "branch",
        title: "car.vehicle.branch",
        kind: "relation",
        relation: { resource: "scm_branches", labelField: "name", subFields: ["address"] },
      },
      {
        name: "category",
        title: "car.vehicle.category",
        kind: "relation",
        relation: { resource: "scm_vehicle_categories", labelField: "name" },
      },
    ],
    columns: [
      { accessor: "plate_number", size: 130, header: "car.vehicle.plate_number", sortable: true },
      {
        accessor: "brand",
        size: 190,
        header: "car.vehicle.info",
        composite: [
          { accessor: "brand", kind: "text", priority: "primary" },
          { accessor: "model", kind: "text", label: "car.vehicle.brand" },
          { accessor: "color", kind: "text", label: "car.vehicle.color" },
        ],
      },      {
        accessor: "daily_rate",
        size: 160,
        header: "car.vehicle.pricing",
        composite: [
          { accessor: "daily_rate", kind: "number", label: "car.vehicle.daily_rate" },
          { accessor: "mileage", kind: "number", label: "car.vehicle.mileage" },
        ],
      },
      {
        accessor: "status",
        size: 120,
        header: "car.vehicle.status.label",
        kind: "select",
        options: vehicleStatusOptions,
      },
      {
        accessor: "branch",
        size: 180,
        header: "car.vehicle.location",
        composite: [
          {
            accessor: "branch",
            kind: "relation",
            relation: { resource: "scm_branches", labelField: "name" },
            label: "car.vehicle.branch",
          },
          {
            accessor: "category",
            kind: "relation",
            relation: { resource: "scm_vehicle_categories", labelField: "name" },
            label: "car.vehicle.category",
          },
        ],
      },
    ],
    related: [
      {
        resource: "scm_insurance",
        titleKey: "car.insurance.title",
        filterField: "vehicleId",
        canCreate: true,
        canDelete: true,
        columns: [
          { accessor: "provider", size: 130, header: "car.insurance.provider" },
          { accessor: "type", size: 130, header: "car.insurance.type", kind: "select", options: insuranceTypeOptions },
          { accessor: "policy_number", size: 140, header: "car.insurance.policy_number" },
          { accessor: "premium", size: 100, header: "car.insurance.premium", kind: "number" },
          { accessor: "start_date", size: 120, header: "car.insurance.validity", kind: "date" },
          { accessor: "end_date", size: 120, header: "car.insurance.end_date", kind: "date" },
        ],
      },
      {
        resource: "scm_maintenance",
        titleKey: "car.maintenance.title",
        filterField: "vehicleId",
        canCreate: true,
        canDelete: true,
        columns: [
          { accessor: "type", size: 100, header: "car.maintenance.schedule", kind: "select", options: maintenanceTypeOptions },
          { accessor: "description", size: 200, header: "car.maintenance.description_label" },
          { accessor: "cost", size: 100, header: "car.maintenance.costinfo", kind: "number" },
          { accessor: "date", size: 120, header: "car.maintenance.date", kind: "date" },
          { accessor: "next_date", size: 130, header: "car.maintenance.next_date", kind: "date" },
        ],
      },
      {
        resource: "scm_dispatch",
        titleKey: "car.dispatch.title",
        filterField: "vehicleId",
        canCreate: true,
        canDelete: true,
        columns: [
          { accessor: "dispatch_no", size: 130, header: "car.dispatch.dispatch_no" },
          { accessor: "from_branch", size: 140, header: "car.dispatch.route", kind: "relation", relation: { resource: "scm_branches", labelField: "name" } },
          { accessor: "to_branch", size: 140, header: "car.dispatch.to_branch", kind: "relation", relation: { resource: "scm_branches", labelField: "name" } },
          { accessor: "dispatch_date", size: 120, header: "car.dispatch.schedule", kind: "date" },
          { accessor: "status", size: 120, header: "car.dispatch.status.label", kind: "select", options: dispatchStatusOptions },
        ],
      },
      {
        resource: "scm_violations",
        titleKey: "car.violation.title",
        filterField: "vehicleId",
        canCreate: true,
        canDelete: true,
        columns: [
          { accessor: "date", size: 120, header: "car.violation.detail", kind: "date" },
          { accessor: "location", size: 180, header: "car.violation.location" },
          { accessor: "points", size: 80, header: "car.violation.penalty", kind: "number" },
          { accessor: "fine_amount", size: 110, header: "car.violation.fine_amount", kind: "number" },
          { accessor: "status", size: 120, header: "car.violation.status.label", kind: "select", options: violationStatusOptions },
        ],
      },
      {
        resource: "scm_rental_orders",
        titleKey: "car.order.title",
        filterField: "vehicleId",
        canCreate: true,
        canDelete: true,
        columns: [
          { accessor: "order_no", size: 140, header: "car.order.order_no" },
          { accessor: "customer", size: 140, header: "car.order.customer", kind: "relation", relation: { resource: "scm_customers", labelField: "name" } },
          { accessor: "pickup_time", size: 160, header: "car.order.schedule", kind: "datetime" },
          { accessor: "expected_return", size: 160, header: "car.order.expected_return", kind: "datetime" },
          { accessor: "total_amount", size: 110, header: "car.order.total", kind: "number" },
          { accessor: "status", size: 120, header: "car.order.status.label", kind: "select", options: orderStatusOptions },
        ],
      },
    ],
  },
  {
    name: "scm_vehicle_categories",
    view: "cards",
    cardTitle: "name",
    cardSubtitle: ["base_daily_rate", "description"],
    titleKey: "car.category.title",
    descriptionKey: "car.category.description",
    icon: <Tags />,
    priority: 12,
    group: "car-fleet",
    canCreate: true,
    canDelete: true,
    searchableFields: ["name"],
    fields: [
      { name: "name", title: "car.category.name", kind: "text", required: true },
      { name: "base_daily_rate", title: "car.category.base_daily_rate", kind: "number" },
      { name: "description", title: "car.category.description_label", kind: "textarea" },
    ],
    columns: [
      { accessor: "name", header: "car.category.name", sortable: true },
      { accessor: "base_daily_rate", header: "car.category.base_daily_rate", kind: "number" },
      { accessor: "description", header: "car.category.description_label" },
    ],
  },
  {
    name: "scm_branches",
    view: "cards",
    cardTitle: "name",
    cardSubtitle: ["phone", "address", "business_hours"],
    cardBadge: "status",
    cardBadgeOptions: branchStatusOptions,
    titleKey: "car.branch.title",
    descriptionKey: "car.branch.description",
    icon: <Building2 />,
    priority: 51,
    group: "car-base",
    canCreate: true,
    canDelete: true,
    searchableFields: ["name", "address"],
    fields: [
      { name: "name", title: "car.branch.name", kind: "text", required: true },
      { name: "phone", title: "car.branch.phone", kind: "text" },
      { name: "address", title: "car.branch.address", kind: "textarea" },
      { name: "business_hours", title: "car.branch.business_hours", kind: "text" },
      { name: "status", title: "car.branch.status.label", kind: "select", options: branchStatusOptions },
    ],
    columns: [
      { accessor: "name", header: "car.branch.name", sortable: true },
      { accessor: "phone", header: "car.branch.phone" },
      { accessor: "address", header: "car.branch.address" },
      { accessor: "business_hours", header: "car.branch.business_hours" },
      { accessor: "status", header: "car.branch.status.label", kind: "select", options: branchStatusOptions },
    ],
  },
  {
    name: "scm_insurance",
    titleKey: "car.insurance.title",
    descriptionKey: "car.insurance.description",
    icon: <ShieldCheck />,
    priority: 13,
    group: "car-fleet",
    canCreate: true,
    canDelete: true,
    searchableFields: ["provider", "policy_number"],
    fields: [
      {
        name: "vehicle",
        title: "car.insurance.vehicle",
        kind: "relation",
        required: true,
        relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] },
      },
      { name: "type", title: "car.insurance.type", kind: "select", options: insuranceTypeOptions },
      { name: "provider", title: "car.insurance.provider", kind: "text" },
      { name: "policy_number", title: "car.insurance.policy_number", kind: "text" },
      { name: "premium", title: "car.insurance.premium", kind: "number" },
      { name: "start_date", title: "car.insurance.start_date", kind: "date" },
      { name: "end_date", title: "car.insurance.end_date", kind: "date" },
    ],
    columns: [
      { accessor: "vehicle", size: 180, header: "car.insurance.vehicle", kind: "relation", relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] } },
      {
        accessor: "provider",
        size: 200,
        header: "car.insurance.cover",
        composite: [
          { accessor: "provider", kind: "text", label: "car.insurance.provider" },
          { accessor: "type", kind: "select", options: insuranceTypeOptions, label: "car.insurance.type" },
        ],
      },
      {
        accessor: "policy_number",
        size: 170,
        header: "car.insurance.policy",
        composite: [
          { accessor: "policy_number", kind: "text", label: "car.insurance.policy_number" },
          { accessor: "premium", kind: "number", label: "car.insurance.premium" },
        ],
      },
      {
        accessor: "start_date",
        size: 200,
        header: "car.insurance.validity",
        composite: [
          { accessor: "start_date", kind: "date", label: "car.insurance.start_date" },
          { accessor: "end_date", kind: "date", label: "car.insurance.end_date" },
        ],
      },
    ],
  },
  {
    name: "scm_maintenance",
    titleKey: "car.maintenance.title",
    descriptionKey: "car.maintenance.description",
    icon: <Wrench />,
    priority: 14,
    group: "car-fleet",
    canCreate: true,
    canDelete: true,
    searchableFields: ["description"],
    fields: [
      {
        name: "vehicle",
        title: "car.maintenance.vehicle",
        kind: "relation",
        required: true,
        relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] },
      },
      { name: "type", title: "car.maintenance.type.label", kind: "select", options: maintenanceTypeOptions },
      { name: "description", title: "car.maintenance.description_label", kind: "textarea" },
      { name: "cost", title: "car.maintenance.cost", kind: "number" },
      { name: "date", title: "car.maintenance.date", kind: "date" },
      { name: "next_date", title: "car.maintenance.next_date", kind: "date" },
    ],
    columns: [
      { accessor: "vehicle", size: 180, header: "car.maintenance.vehicle", kind: "relation", relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] } },
      {
        accessor: "type",
        size: 220,
        header: "car.maintenance.schedule",
        composite: [
          { accessor: "type", kind: "select", options: maintenanceTypeOptions, label: "car.maintenance.type.label" },
          { accessor: "date", kind: "date", label: "car.maintenance.date" },
        ],
      },
      { accessor: "description", size: 220, header: "car.maintenance.description_label" },
      {
        accessor: "cost",
        size: 160,
        header: "car.maintenance.costinfo",
        composite: [
          { accessor: "cost", kind: "number", label: "car.maintenance.cost" },
          { accessor: "next_date", kind: "date", label: "car.maintenance.next_date" },
        ],
      },
    ],
  },
  {
    name: "scm_dispatch",
    titleKey: "car.dispatch.title",
    descriptionKey: "car.dispatch.description",
    icon: <MapPin />,
    priority: 15,
    group: "car-fleet",
    canCreate: true,
    canDelete: true,
    searchableFields: ["dispatch_no", "reason"],
    aiAssistant: {
      kind: "scm_dispatch",
      titleKey: "car.dispatch.ai.title",
      descriptionKey: "car.dispatch.ai.description",
    },
    view: "kanban",
    boardField: "status",
    boardTitle: "dispatch_no",
    boardSubtitle: ["vehicle", "from_branch", "to_branch", "dispatch_date"],
    fields: [
      {
        name: "vehicle",
        title: "car.dispatch.vehicle",
        kind: "relation",
        required: true,
        relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] },
      },
      {
        name: "from_branch",
        title: "car.dispatch.from_branch",
        kind: "relation",
        required: true,
        relation: { resource: "scm_branches", labelField: "name", subFields: ["address"] },
      },
      {
        name: "to_branch",
        title: "car.dispatch.to_branch",
        kind: "relation",
        required: true,
        relation: { resource: "scm_branches", labelField: "name", subFields: ["address"] },
      },
      { name: "dispatch_date", title: "car.dispatch.dispatch_date", kind: "date" },
      { name: "status", title: "car.dispatch.status.label", kind: "select", options: dispatchStatusOptions },
      { name: "reason", title: "car.dispatch.reason", kind: "textarea" },
    ],
    columns: [
      { accessor: "dispatch_no", size: 140, header: "car.dispatch.dispatch_no", sortable: true },
      { accessor: "vehicle", size: 180, header: "car.dispatch.vehicle", kind: "relation", relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] } },
      {
        accessor: "from_branch",
        size: 220,
        header: "car.dispatch.route",
        composite: [
          { accessor: "from_branch", kind: "relation", relation: { resource: "scm_branches", labelField: "name" }, label: "car.dispatch.from_branch" },
          { accessor: "to_branch", kind: "relation", relation: { resource: "scm_branches", labelField: "name" }, label: "car.dispatch.to_branch" },
        ],
      },
      {
        accessor: "dispatch_date",
        size: 160,
        header: "car.dispatch.schedule",
        composite: [
          { accessor: "dispatch_date", kind: "date", label: "car.dispatch.dispatch_date" },
          { accessor: "status", kind: "select", options: dispatchStatusOptions, label: "car.dispatch.status.label" },
        ],
      },
    ],
  },
  {
    name: "scm_violations",
    titleKey: "car.violation.title",
    descriptionKey: "car.violation.description",
    icon: <CircleGauge />,
    priority: 16,
    group: "car-fleet",
    canCreate: true,
    canDelete: true,
    searchableFields: ["location", "description"],
    fields: [
      {
        name: "vehicle",
        title: "car.violation.vehicle",
        kind: "relation",
        required: true,
        relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] },
      },
      { name: "date", title: "car.violation.date", kind: "date" },
      { name: "location", title: "car.violation.location", kind: "text" },
      { name: "points", title: "car.violation.points", kind: "number" },
      { name: "fine_amount", title: "car.violation.fine_amount", kind: "number" },
      { name: "status", title: "car.violation.status.label", kind: "select", options: violationStatusOptions },
      { name: "description", title: "car.violation.description_label", kind: "textarea" },
    ],
    columns: [
      { accessor: "vehicle", size: 180, header: "car.violation.vehicle", kind: "relation", relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] } },
      {
        accessor: "date",
        size: 160,
        header: "car.violation.detail",
        composite: [
          { accessor: "date", kind: "date", label: "car.violation.date" },
          { accessor: "status", kind: "select", options: violationStatusOptions, label: "car.violation.status.label" },
        ],
      },
      { accessor: "location", size: 220, header: "car.violation.location", sortable: true },
      {
        accessor: "points",
        size: 140,
        header: "car.violation.penalty",
        composite: [
          { accessor: "points", kind: "number", label: "car.violation.points" },
          { accessor: "fine_amount", kind: "number", label: "car.violation.fine_amount" },
        ],
      },
    ],
  },
  {
    name: "scm_customers",
    titleKey: "car.customer.title",
    descriptionKey: "car.customer.description",
    icon: <Users />,
    priority: 21,
    group: "car-customers",
    canCreate: true,
    canDelete: true,
    searchableFields: ["name", "phone", "company_name"],
    fields: [
      { name: "name", title: "car.customer.name", kind: "text", required: true },
      { name: "phone", title: "car.customer.phone", kind: "text" },
      { name: "customer_type", title: "car.customer.type.label", kind: "select", options: customerTypeOptions },
      { name: "company_name", title: "car.customer.company_name", kind: "text" },
      { name: "id_card", title: "car.customer.id_card", kind: "text" },
      { name: "driver_license", title: "car.customer.driver_license", kind: "text" },
      { name: "license_expiry", title: "car.customer.license_expiry", kind: "date" },
      { name: "email", title: "car.customer.email", kind: "text" },
      { name: "address", title: "car.customer.address", kind: "textarea" },
      { name: "credit_level", title: "car.customer.credit_level.label", kind: "select", options: creditLevelOptions },
      { name: "status", title: "car.customer.status.label", kind: "select", options: customerStatusOptions },
      { name: "remark", title: "car.customer.remark", kind: "textarea" },
    ],
    columns: [
      { accessor: "name", size: 180, header: "car.customer.name", sortable: true },
      {
        accessor: "phone",
        size: 200,
        header: "car.customer.contact",
        composite: [
          { accessor: "phone", kind: "text", label: "car.customer.phone" },
          { accessor: "customer_type", kind: "select", options: customerTypeOptions, label: "car.customer.type.label" },
        ],
      },
      {
        accessor: "company_name",
        size: 180,
        header: "car.customer.company",
        composite: [
          { accessor: "company_name", kind: "text", label: "car.customer.company_name" },
          { accessor: "credit_level", kind: "select", options: creditLevelOptions, label: "car.customer.credit_level.label" },
        ],
      },
      { accessor: "status", size: 110, header: "car.customer.status.label", kind: "select", options: customerStatusOptions },
    ],
  },
  {
    name: "scm_rental_orders",
    titleKey: "car.order.title",
    descriptionKey: "car.order.description",
    icon: <CarTaxiFront />,
    priority: 31,
    group: "car-rental",
    canCreate: true,
    canDelete: true,
    searchableFields: ["order_no"],
    view: "calendar",
    calendarField: "pickup_time",
    calendarEndField: "expected_return",
    calendarTitleField: "vehicle",
    fields: [
      { name: "order_no", title: "car.order.order_no", kind: "text", autoGenerated: true },
      {
        name: "customer",
        title: "car.order.customer",
        kind: "relation",
        required: true,
        relation: { resource: "scm_customers", labelField: "name", subFields: ["phone"] },
      },
      {
        name: "vehicle",
        title: "car.order.vehicle",
        kind: "relation",
        required: true,
        relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] },
      },
      { name: "pickup_time", title: "car.order.pickup_time", kind: "datetime" },
      { name: "expected_return", title: "car.order.expected_return", kind: "datetime" },
      { name: "actual_return", title: "car.order.actual_return", kind: "datetime" },
      { name: "daily_rate", title: "car.order.daily_rate", kind: "number" },
      { name: "total_amount", title: "car.order.total_amount", kind: "number" },
      { name: "status", title: "car.order.status.label", kind: "select", options: orderStatusOptions },
      {
        name: "cancel_reason",
        title: "car.order.cancel_reason.label",
        kind: "select",
        options: cancelReasonOptions,
      },
    ],
    columns: [
      { accessor: "order_no", size: 150, header: "car.order.order_no", sortable: true },
      {
        accessor: "customer",
        size: 200,
        header: "car.order.customer",
        composite: [
          { accessor: "customer", kind: "relation", relation: { resource: "scm_customers", labelField: "name", subFields: ["phone"] } },
        ],
      },
      {
        accessor: "vehicle",
        size: 170,
        header: "car.order.vehicle",
        composite: [
          { accessor: "vehicle", kind: "relation", relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] } },
        ],
      },
      {
        accessor: "pickup_time",
        size: 210,
        header: "car.order.schedule",
        composite: [
          { accessor: "pickup_time", kind: "datetime", label: "car.order.pickup_time" },
          { accessor: "expected_return", kind: "datetime", label: "car.order.expected_return" },
        ],
      },
      {
        accessor: "total_amount",
        size: 150,
        header: "car.order.total",
        composite: [
          { accessor: "total_amount", kind: "number", label: "car.order.total_amount" },
          { accessor: "status", kind: "select", options: orderStatusOptions, label: "car.order.status.label" },
        ],
      },
    ],
    related: [
      {
        resource: "scm_payments",
        titleKey: "car.payment.title",
        filterField: "orderId",
        canCreate: true,
        canDelete: true,
        columns: [
          { accessor: "amount", size: 120, header: "car.payment.amount", kind: "number" },
          { accessor: "deposit", size: 110, header: "car.payment.deposit", kind: "number" },
          { accessor: "refund", size: 110, header: "car.payment.refund", kind: "number" },
          { accessor: "payment_method", size: 130, header: "car.payment.payment_method", kind: "select", options: paymentMethodOptions },
          { accessor: "payment_time", size: 160, header: "car.payment.payment_time", kind: "datetime" },
          { accessor: "status", size: 120, header: "car.payment.status.label", kind: "select", options: paymentStatusOptions },
        ],
      },
    ],
  },
  {
    name: "scm_contracts",
    titleKey: "car.contract.title",
    descriptionKey: "car.contract.description",
    icon: <FileText />,
    priority: 32,
    group: "car-rental",
    canCreate: true,
    canDelete: true,
    searchableFields: ["contract_no"],
    aiAssistant: {
      kind: "contract",
      titleKey: "car.contract.ai.title",
      descriptionKey: "car.contract.ai.description",
    },
    fields: [
      { name: "contract_no", title: "car.contract.contract_no", kind: "text" },
      {
        name: "order",
        title: "car.contract.order",
        kind: "relation",
        relation: { resource: "scm_rental_orders", labelField: "order_no" },
      },
      {
        name: "customer",
        title: "car.contract.customer",
        kind: "relation",
        relation: { resource: "scm_customers", labelField: "name", subFields: ["phone"] },
      },
      { name: "sign_date", title: "car.contract.sign_date", kind: "date" },
      { name: "content", title: "car.contract.content", kind: "textarea" },
      { name: "status", title: "car.contract.status.label", kind: "select", options: contractStatusOptions },
      { name: "attachments", title: "car.contract.attachments", kind: "attachment" },
    ],
    columns: [
      { accessor: "contract_no", header: "car.contract.contract_no", sortable: true },
      { accessor: "order", header: "car.contract.order", kind: "relation", relation: { resource: "scm_rental_orders", labelField: "order_no" } },
      { accessor: "customer", header: "car.contract.customer", kind: "relation", relation: { resource: "scm_customers", labelField: "name", subFields: ["phone"] } },
      { accessor: "sign_date", header: "car.contract.sign_date", kind: "date" },
      { accessor: "status", header: "car.contract.status.label", kind: "select", options: contractStatusOptions },
      { accessor: "attachments", header: "car.contract.attachments", kind: "attachment", size: 120 },
    ],
  },
  {
    name: "scm_car_todos",
    titleKey: "car.todo.title",
    descriptionKey: "car.todo.description",
    icon: <CircleGauge />,
    priority: 33,
    group: "car-rental",
    canCreate: true,
    canDelete: true,
    searchableFields: ["title", "description"],
    fields: [
      { name: "title", title: "car.todo.title_label", kind: "text", required: true },
      { name: "kind", title: "car.todo.kind", kind: "select", options: todoKindOptions },
      { name: "status", title: "car.todo.status", kind: "select", options: todoStatusOptions },
      { name: "due_date", title: "car.todo.due_date", kind: "date" },
      {
        name: "vehicle",
        title: "car.todo.vehicle",
        kind: "relation",
        relation: { resource: "scm_vehicles", labelField: "plate_number", subFields: ["brand", "model"] },
      },
      {
        name: "customer",
        title: "car.todo.customer",
        kind: "relation",
        relation: { resource: "scm_customers", labelField: "name", subFields: ["phone"] },
      },
      {
        name: "order",
        title: "car.todo.order",
        kind: "relation",
        relation: { resource: "scm_rental_orders", labelField: "order_no" },
      },
      { name: "source_type", title: "car.todo.source_type", kind: "select", options: todoSourceTypeOptions },
      { name: "source_id", title: "car.todo.source_id", kind: "number" },
      { name: "description", title: "car.todo.description_label", kind: "textarea" },
    ],
    columns: [
      { accessor: "title", size: 200, header: "car.todo.title_label", sortable: true },
      { accessor: "kind", size: 140, header: "car.todo.kind", kind: "select", options: todoKindOptions },
      {
        accessor: "due_date",
        size: 174,
        header: "car.todo.deadline",
        composite: [
          { accessor: "due_date", kind: "date", label: "car.todo.due_date" },
          { accessor: "status", kind: "select", options: todoStatusOptions, label: "car.todo.status" },
        ],
      },
      {
        accessor: "vehicle",
        size: 150,
        header: "car.todo.vehicle",
        kind: "relation",
        relation: { resource: "scm_vehicles", labelField: "plate_number" },
      },
      {
        accessor: "customer",
        size: 160,
        header: "car.todo.customer",
        kind: "relation",
        relation: { resource: "scm_customers", labelField: "name" },
      },
      { accessor: "order", size: 150, header: "car.todo.order", kind: "relation", relation: { resource: "scm_rental_orders", labelField: "order_no" } },
    ],
  },
  {
    name: "scm_payments",
    titleKey: "car.payment.title",
    descriptionKey: "car.payment.description",
    icon: <WalletCards />,
    priority: 41,
    group: "car-finance",
    canCreate: true,
    canDelete: true,
    searchableFields: ["payment_method"],
    fields: [
      {
        name: "order",
        title: "car.payment.order",
        kind: "relation",
        required: true,
        relation: { resource: "scm_rental_orders", labelField: "order_no" },
      },
      { name: "amount", title: "car.payment.amount", kind: "number" },
      { name: "deposit", title: "car.payment.deposit", kind: "number" },
      { name: "refund", title: "car.payment.refund", kind: "number" },
      { name: "payment_method", title: "car.payment.payment_method", kind: "select", options: paymentMethodOptions },
      { name: "payment_time", title: "car.payment.payment_time", kind: "datetime" },
      { name: "status", title: "car.payment.status.label", kind: "select", options: paymentStatusOptions },
    ],
    columns: [
      { accessor: "order", size: 190, header: "car.payment.order", kind: "relation", relation: { resource: "scm_rental_orders", labelField: "order_no" } },
      {
        accessor: "amount",
        size: 160,
        header: "car.payment.settlement",
        composite: [
          { accessor: "amount", kind: "number", label: "car.payment.amount" },
          { accessor: "deposit", kind: "number", label: "car.payment.deposit" },
        ],
      },
      { accessor: "refund", size: 110, header: "car.payment.refund", kind: "number" },
      { accessor: "payment_method", size: 140, header: "car.payment.payment_method", kind: "select", options: paymentMethodOptions, sortable: true },
      { accessor: "payment_time", size: 180, header: "car.payment.payment_time", kind: "datetime" },
      { accessor: "status", size: 130, header: "car.payment.status.label", kind: "select", options: paymentStatusOptions },
    ],
  },
  {
    name: "scm_suppliers",
    titleKey: "car.supplier.title",
    descriptionKey: "car.supplier.description",
    icon: <HandCoins />,
    priority: 52,
    group: "car-base",
    canCreate: true,
    canDelete: true,
    searchableFields: ["code", "name", "contact"],
    fields: [
      { name: "code", title: "car.supplier.code", kind: "text" },
      { name: "name", title: "car.supplier.name", kind: "text", required: true },
      { name: "contact", title: "car.supplier.contact", kind: "text" },
      { name: "phone", title: "car.supplier.phone", kind: "text" },
      { name: "address", title: "car.supplier.address", kind: "textarea" },
      { name: "remark", title: "car.supplier.remark", kind: "textarea" },
    ],
    columns: [
      { accessor: "code", header: "car.supplier.code", sortable: true },
      { accessor: "name", header: "car.supplier.name", sortable: true },
      { accessor: "contact", header: "car.supplier.contact" },
      { accessor: "phone", header: "car.supplier.phone" },
      { accessor: "remark", header: "car.supplier.remark" },
    ],
  },
  {
    name: "scm_staff",
    titleKey: "car.staff.title",
    descriptionKey: "car.staff.description",
    icon: <Gauge />,
    priority: 53,
    group: "car-base",
    canCreate: true,
    canDelete: true,
    searchableFields: ["name", "position"],
    fields: [
      { name: "name", title: "car.staff.name", kind: "text", required: true },
      { name: "position", title: "car.staff.position", kind: "text" },
      { name: "phone", title: "car.staff.phone", kind: "text" },
      { name: "role", title: "car.staff.role", kind: "select", options: staffRoleOptions },
      {
        name: "branch",
        title: "car.staff.branch",
        kind: "relation",
        relation: { resource: "scm_branches", labelField: "name", subFields: ["address"] },
      },
    ],
    columns: [
      { accessor: "name", header: "car.staff.name", sortable: true },
      { accessor: "position", header: "car.staff.position" },
      { accessor: "phone", header: "car.staff.phone" },
      { accessor: "role", header: "car.staff.role", kind: "select", options: staffRoleOptions },
      { accessor: "branch", header: "car.staff.branch", kind: "relation", relation: { resource: "scm_branches", labelField: "name", subFields: ["address"] } },
    ],
  },
];

export const resourceMap = new Map(
  resourceConfigs.map((config) => [config.name, config])
);
