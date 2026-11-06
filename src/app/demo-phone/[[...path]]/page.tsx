import type { Metadata } from "next";
import { Suspense } from "react";
import DeviceFrame from "@/features/demo-frame/DeviceFrame";
import { appPath } from "@/features/demo-frame/path";

export const metadata: Metadata = { title: "Elevate on iPhone" };

// /demo-phone/<app path>, e.g. /demo-phone/me/classes: that page inside an iPhone.
export default function DemoPhonePage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <Frame params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Frame({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ path }, search] = await Promise.all([params, searchParams]);
  return <DeviceFrame kind="phone" src={appPath(path, search)} />;
}
