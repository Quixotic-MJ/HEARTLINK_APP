import { Platform } from "react-native";

/**
 * HL-024: one structured log line per app error, so crashes are easy to find in
 * Expo / device logs (search for "app_error"). No monitoring service is wired up yet.
 */
export function logAppError(error: unknown, source: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry = {
    event: "app_error",
    source,
    name: err.name,
    message: err.message,
    stack: err.stack?.split("\n").slice(0, 8).join("\n"),
    platform: Platform.OS,
    at: new Date().toISOString(),
  };
  console.error("[HeartLink]", JSON.stringify(entry));
}

let globalLoggingInstalled = false;

/**
 * Logs errors thrown outside rendering (button handlers, timers) as well, then hands
 * them to React Native's normal handler, so behaviour is otherwise unchanged.
 */
export function installGlobalErrorLogging(): void {
  if (globalLoggingInstalled) return;
  globalLoggingInstalled = true;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    logAppError(error, isFatal ? "global_fatal" : "global");
    previous(error, isFatal);
  });
}
