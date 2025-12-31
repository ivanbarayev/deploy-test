import type messages from "./messages/en";
import type { formats } from "./src/i18n/request";
import type { routing } from "./src/i18n/routing";

export interface AppConfigNextIntl {
  Locales: typeof routing.locales;
  Messages: typeof messages;
  Formats: typeof formats;
}
