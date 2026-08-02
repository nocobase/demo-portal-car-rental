import { registerTranslationResources } from "@nocobase/portal-sdk/i18n";
import { starter as enUSStarter } from "./en-US";
import { starter as zhCNStarter } from "./zh-CN";
import { car as enUSCar } from "./en-US";
import { car as zhCNCar } from "./zh-CN";

registerTranslationResources("starter", {
  "en-US": enUSStarter,
  "zh-CN": zhCNStarter,
});

registerTranslationResources("car", {
  "en-US": enUSCar,
  "zh-CN": zhCNCar,
});
