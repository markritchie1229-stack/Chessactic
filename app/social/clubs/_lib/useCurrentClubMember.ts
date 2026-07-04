"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { ClubMember } from "./types";

type UseCurrentClubMemberResult = {
  member: ClubMember | null;
  loading: boolean;
  error: string;
};

export function useCurrentClubMember(
  clubId: string,
): UseCurrentClubMemberResult {
  const [member, setMember] = useState<ClubMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadMember() {
      try {
        setLoading(true);
        setError("");

        if (!clubId) {
          console.log("[club-member] missing clubId");
          if (mounted) {
            setMember(null);
            setLoading(false);
          }
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        const {
  data: { user },
} = await supabase.auth.getUser();

console.log("========== AUTH DEBUG ==========");
console.log("Session:", session);
console.log("User:", user);

const {
  data: sessionList,
} = await supabase.auth.getSession();

console.log("Session List:", sessionList);

const {
  data: allMembers,
  error: allMembersError,
} = await supabase
  .from("club_members")
  .select("*");

console.log("All Members:", allMembers);
console.log("Members Error:", allMembersError);

console.log("================================");
        console.log("[club-member] clubId:", clubId);
        console.log("[club-member] sessionError:", sessionError);
        console.log("[club-member] session user id:", session?.user?.id ?? null);

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session?.user?.id) {
          console.log("[club-member] no session user");
          if (mounted) {
            setMember(null);
            setLoading(false);
          }
          return;
        }

        const { data, error: memberError } = await supabase
          .from("club_members")
          .select("*")
          .eq("club_id", clubId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        console.log("[club-member] memberError:", memberError);
        console.log("[club-member] member row:", data);

        if (memberError) {
          throw new Error(memberError.message);
        }

        if (mounted) {
          setMember((data as ClubMember | null) ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error("[club-member] load failed:", err);

        if (mounted) {
          setMember(null);
          setLoading(false);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load club membership.",
          );
        }
      }
    }

    void loadMember();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (mounted) {
        void loadMember();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clubId]);

  return { member, loading, error };
}