// app/support-groups/[id]/create-post/page.tsx
import React from "react";
import { groupApi } from "@/features/support_groups/api/group.api";
import CreatePostClient from "@/features/support_groups/CreatePostClient";
import { cookies } from "next/headers";

export default async function Page(props: PageProps<'/support-group/[id]/create-post'>) {
  const {id} = await props.params;
  const groupId = id
  if (!id) return <div>Group id missing</div>;

  const cookieStore = await cookies()
  const access = cookieStore.get('accessToken')?.value ?? ""

  // SSR: fetch minimal group info (title + avatar) to render header
  let rawGroup: any = null;
  try {
    rawGroup = await groupApi.getGroup(id,access).catch(() => null);
  } catch (e) {
    rawGroup = null;
  }

  const groupTitle = rawGroup?.title ?? "Support group";
  const groupAvatar = rawGroup?.image_url ?? "/images/group-thumb.png";

  return <CreatePostClient groupId={id} groupTitle={groupTitle} groupAvatar={groupAvatar} />;
}
