"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";

export default function CreatePostClient({
  groupId,
  groupTitle,
  groupAvatar,
  initialCurrentUser = null,
}: {
  groupId: string;
  groupTitle: string;
  groupAvatar: string;
  initialCurrentUser?: any | null;
}) {
  const router = useRouter();
  // hydrate from server if provided, otherwise null (client may fetch later)
  const [currentUser, setCurrentUser] = useState<any | null>(initialCurrentUser ?? null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(false);

  // If server didn't supply user, optionally fetch on client (keeps previous behavior)
  useEffect(() => {
    if (initialCurrentUser) return; // already hydrated
    let mounted = true;
    (async () => {
      try {
        const u = await authApi.getCurrentUser();
        if (!mounted) return;
        setCurrentUser(u ?? null);
      } catch (e) {
        if (!mounted) return;
        setCurrentUser(null);
      }
    })();
    return () => { mounted = false; };
  }, [initialCurrentUser]);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!currentUser) {
      // redirect to login with next pointing back to create-post
      router.push(`/login?next=${encodeURIComponent(`/support-groups/${groupId}/create-post`)}`);
      return;
    }

    if (!content.trim()) {
      alert("Please enter your thoughts");
      return;
    }

    setLoading(true);
    try {
      const payload = { title: title.trim() || undefined, content: content.trim(), tag: tag.trim() || undefined, category: [0] };

      // NOTE: groupApi.createPost uses authApi.fetchWithAuth under the hood.
      // If you rely on cookie-based sessions, ensure fetchWithAuth uses credentials: 'include'
      // or calls your server-proxy route so cookies are forwarded.
      const created = await groupApi.createPost(groupId, payload);

      // Redirect to group page with newPostId + success + image if available
      const newId = created?.id ?? created?.pk ?? created?._id ?? "";
      // try common places for an image in the response
      const imageUrl =
        created?.image_url ??
        created?.image ??
        (created?.attachments && created.attachments[0] && (created.attachments[0].url || created.attachments[0].file_url)) ??
        "";

      const q = new URLSearchParams();
      if (newId) q.set("newPostId", String(newId));
      q.set("success", "1");
      if (imageUrl) q.set("successImage", imageUrl);

      router.push(`/group/${groupId}?${q.toString()}`);
    } catch (err: any) {
      console.error("Create post failed", err);
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/support-groups/${groupId}/create-post`)}`);
        return;
      }
      alert("Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* top header */}
      <header className="h-14 flex items-center px-3 border-b border-[#ECECEC]">
        <button aria-label="Back" onClick={handleBack} className="h-9 w-9 flex items-center justify-center rounded-md" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6L9 12l6 6" stroke="#0F141A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <h1 className="flex-1 text-center font-semibold text-[16px] text-[#0F141A]">Create Post</h1>

        <div className="w-[72px] flex items-center justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            aria-disabled={loading}
            aria-label="Post"
            className={`h-10 px-3 rounded-lg text-white font-semibold flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              loading ? "bg-[#9AA6B2] cursor-not-allowed" : "bg-[#18448A]"
            }`}
            type="button"
          >
            {loading ? "Posting…" : "Post"}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-[#F3F4F6] flex-shrink-0">
              <Image src={groupAvatar || "/images/group-thumb.png"} alt="group avatar" width={40} height={40} className="object-cover" />
            </div>
            <div>
              <div className="font-semibold text-[#034EA1]">{groupTitle}</div>
            </div>
          </div>

          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title (optional)"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16AF9F]"
            />
          </div>

          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={8}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16AF9F] min-h-[160px]"
            />
          </div>
        </form>
      </main>
    </div>
  );
}
