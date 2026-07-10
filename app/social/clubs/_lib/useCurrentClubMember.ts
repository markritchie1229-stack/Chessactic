"use client";

import { useEffect, useState } from "react";

import { isAdmin } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import { makeSiteAdminMember } from "./effective-member";
import type { ClubMember } from "./types";

type UseCurrentClubMemberResult = {
  member: ClubMember | null;
  loading: boolean;
  error: string;
};

export function useCurrentClubMember(clubId: string): UseCurrentClubMemberResult {
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

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session?.user) {
          if (mounted) {
            setMember(null);
            setLoading(false);
          }
          return;
        }

        if (isAdmin(session.user.id)) {
          if (mounted) {
            setMember(makeSiteAdminMember(clubId, session.user.id));
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

        if (memberError) {
          throw new Error(memberError.message);
        }

        if (mounted) {
          setMember((data as ClubMember | null) ?? null);
          setLoading(false);
        }
      } catch (err) {
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