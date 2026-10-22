import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "./instrumentation";

afterEach(() => vi.restoreAllMocks());

describe("onRequestError", () => {
  it("logs the route and error, without the query string", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await onRequestError(
      Object.assign(new Error("db down"), { digest: "d1" }),
      { path: "/join?firstName=Geoff&phone=2505550142", method: "POST", headers: {} },
      { routerKind: "App Router", routePath: "/join", routeType: "action", renderSource: undefined } as never,
    );
    const out = JSON.parse(String(spy.mock.calls[0][0]));
    expect(out).toMatchObject({
      event: "server_error",
      path: "/join",
      method: "POST",
      routePath: "/join",
      routeType: "action",
      digest: "d1",
    });
    expect(JSON.stringify(out)).not.toContain("Geoff");
  });
});
