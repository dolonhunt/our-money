"use client";

import { Heart } from "lucide-react";
import type { Activity } from "@/types";
import type { HouseholdMember } from "@/types";
import { relativeTime } from "@/lib/dates";
import { Avatar, SectionHead } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/feedback";

/** "Together" — the couple activity feed, a defining feature (PRD §29, §66). */
export function TogetherFeed({ activity, members, max = 6 }: { activity: Activity[]; members: HouseholdMember[]; max?: number }) {
  const items = activity.slice(0, max);
  return (
    <section aria-label="Together activity">
      <SectionHead title="Together" subtitle="What you both changed recently" />
      <div className="neu-card p-3 sm:p-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<Heart size={26} />}
            title="Your story starts here"
            description="Add income, expenses or goals — you'll both see every change here, live."
          />
        ) : (
          <ul className="space-y-1">
            {items.map((a) => {
              const actor = members.find((m) => m.uid === a.actorId);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-[rgba(138,206,209,0.08)]">
                  <Avatar name={actor?.displayName ?? "Someone"} photoURL={actor?.photoURL} size={34} ring={members[0]?.uid === a.actorId ? "mint" : "peach"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] text-ink">
                      <strong className="font-semibold">{actor?.displayName ?? "Someone"}</strong>{" "}
                      <span className="text-sub">{a.description}</span>
                    </p>
                    <p className="text-[11px] text-faint">{relativeTime(a.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
