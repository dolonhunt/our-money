"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSetupState } from "@/hooks/useSetupState";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import { SafeErrorView } from "@/components/layout/SafeErrorView";

/** Entry redirect: resolves setupState before routing. */
export default function Home() {
  const { setupState, error, retry } = useSetupState();
  const router = useRouter();

  useEffect(() => {
    if (setupState === "loading" || setupState === "error") return;
    if (setupState === "unauthorized") {
      router.replace("/login");
    } else if (setupState === "complete") {
      router.replace("/dashboard");
    } else if (setupState === "needs_profile" || setupState === "needs_household") {
      router.replace("/onboarding");
    }
  }, [setupState, router]);

  if (setupState === "error") {
    return <SafeErrorView onRetry={retry} message={error?.message} />;
  }

  return <AppShellSkeleton />;
}
