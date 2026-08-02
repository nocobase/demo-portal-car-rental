import { useTranslate } from "@refinedev/core";

export const useCarLabel = () => {
  const translate = useTranslate();
  return (key: string) => translate(key, { ns: "car" }, key);
};

export const resolveCarLabel = (
  key: string,
  fallback: string,
  translate: ReturnType<typeof useTranslate>
) => translate(key, { ns: "car" }, fallback);
