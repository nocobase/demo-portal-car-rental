import type { RefCallback } from "react";

import {
  useAIPageElementHandle,
  useAIForm,
  type AIEmployee,
} from "@/extensions/nocobase-ai";

export { useAIPageElementHandle };

const EXCLUDED_BUSINESS_EMPLOYEES = ["nathan", "dara", "lina", "orin"];

export const isBusinessAIEmployee = (employee: AIEmployee) =>
  !EXCLUDED_BUSINESS_EMPLOYEES.includes(employee.username.toLowerCase());

export const pickBusinessAIEmployee = (
  employees: AIEmployee[],
  preferred = "atlas"
): AIEmployee | undefined =>
  employees.find(
    (employee) =>
      isBusinessAIEmployee(employee) &&
      employee.username.toLowerCase() === preferred
  ) ??
  employees.find(isBusinessAIEmployee) ??
  employees[0];

export type AIFormField = {
  name: string;
  title?: string;
  type?: string;
  description?: string;
  readonly?: boolean;
  required?: boolean;
  enum?: unknown;
  [key: string]: unknown;
};

export const useCarAIForm = useAIForm;

export type AIPageElementHandle = ReturnType<typeof useAIPageElementHandle>;
export type AIPageElementRef = RefCallback<HTMLElement>;
