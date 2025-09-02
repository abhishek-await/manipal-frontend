// app/support-groups/[id]/create-post/page.tsx
import React from "react";
import { groupApi } from "@/features/support_groups/api/group.api";
import CreatePostClient from "@/features/support_groups/CreatePostClient";

type PageProps<T extends string = string> = {
  params: Record<string, string>
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function Page(props: PageProps) {
  const id = props?.params?.id;
  if (!id) return <div>Group id missing</div>;

  // SSR: fetch minimal group info (title + avatar) to render header
  let rawGroup: any = null;
  try {
    rawGroup = await groupApi.getGroup(id).catch(() => null);
  } catch (e) {
    rawGroup = null;
  }

  const groupTitle = rawGroup?.title ?? "Support group";
  const groupAvatar = rawGroup?.image_url ?? "/images/group-thumb.png";

  return <CreatePostClient groupId={id} groupTitle={groupTitle} groupAvatar={groupAvatar} />;
}
