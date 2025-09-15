// app/support-groups/[id]/create-post/page.tsx
import React from "react";
import { cookies } from "next/headers";
import CreatePostClient from "@/features/support_groups/CreatePostClient";
import { API_BASE_URL } from "@/features/support_groups/api/group.api";

export default async function Page(props: PageProps<'/support-group/[id]/create-post'>) {
  const { id } = await props.params;
  const groupId = id;
  if (!groupId) return <div>Group id missing</div>;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");
  const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? "";

  // fetch current user server-side (forward cookies)
  let initialCurrentUser: any | null = null;
  try {
    const meRes = await fetch(`${BACKEND}/accounts/user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      // server side fetch by default does not include client cookies, so we forward them in header
      cache: "no-store",
    });
    if (meRes.ok) {
      initialCurrentUser = await meRes.json();
    } else {
      initialCurrentUser = null;
    }
  } catch (e) {
    console.warn("Could not fetch current user server-side", e);
    initialCurrentUser = null;
  }

  // SSR: fetch minimal group info (title + avatar) to render header
  let rawGroup: any = null;
  try {
    const gRes = await fetch(`${BACKEND}/support-groups/groups/${groupId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      cache: "no-store",
    });
    if (gRes.ok) rawGroup = await gRes.json();
    else rawGroup = null;
  } catch (e) {
    console.warn("Could not fetch group server-side", e);
    rawGroup = null;
  }

  const groupTitle = rawGroup?.title ?? "Support group";
  const groupAvatar = rawGroup?.image_url ?? "/images/group-thumb.png";

  return (
    <CreatePostClient
      groupId={groupId}
      groupTitle={groupTitle}
      groupAvatar={groupAvatar}
      initialCurrentUser={initialCurrentUser}
    />
  );
}
