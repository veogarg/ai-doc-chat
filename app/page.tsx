"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: chats } = await supabase
        .from("chat_sessions")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (chats?.length) {
        router.push(`/chat/${chats[0].id}`);
      } else {
        const { data } = await supabase
          .from("chat_sessions")
          .insert({
            user_id: user.id,
            title: "New Chat",
          })
          .select()
          .single();

        router.push(`/chat/${data.id}`);
      }
    };

    init();
  }, []);

  return null;
}
