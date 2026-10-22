import type { Instrumentation } from "next";
import { logError } from "@/lib/log";

// Next.js calls this for every error it catches on the server (pages, server
// actions, route handlers, the proxy). It writes one structured log line, so
// the digest shown on the error page can be matched to the full error here.
// An error monitoring service can be added in this hook later (#42).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  logError("server_error", err, {
    // Path without the query string, which can carry form values.
    path: request.path.split("?")[0],
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
