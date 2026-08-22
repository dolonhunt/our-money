"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/feedback";

/** Entry redirect: authenticated → dashboard, else → login. */
export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (profile && !profile.householdId) router.replace("/onboarding");
    else router.replace("/dashboard");
  }, [loading, user, profile, router]);

  return <PageLoader label="Our Money" />;
}
