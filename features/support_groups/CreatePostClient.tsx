// features/support_groups/CreatePostClient.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";

type Category = { id: number; name: string; description: string };

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
  const [currentUser, setCurrentUser] = useState<any | null>(initialCurrentUser ?? null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // tags/categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);

  // media
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // previews
  const [previews, setPreviews] = useState<string[]>([]);

  // rejection
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  // mobile keyboard state (simple heuristic) to add bottom padding while keyboard is open
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialCurrentUser) return;
    let mounted = true;
    (async () => {
      try {
        const u = await authApi.getCurrentUser();
        if (!mounted) return;
        setCurrentUser(u ?? null);
      } catch {
        if (!mounted) return;
        setCurrentUser(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [initialCurrentUser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await groupApi.getPostCategories();
        if (!mounted) return;
        const parsed = Array.isArray(cats)
          ? cats.map((c: any) => ({ id: Number(c.id), name: String(c.name), description: String(c.description || "") }))
          : [];
        setCategories(parsed);
      } catch (err) {
        console.warn("Could not load categories", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // previews
  useEffect(() => {
    const old = previews.slice();
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      old.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  const handleBack = () => router.back();

  const openFilePicker = () => fileInputRef.current?.click();

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl || fl.length === 0) return;
    const list = Array.from(fl).slice(0, 4); // limit to 4
    setFiles((prev) => {
      // allow adding to existing but keep max 4
      const combined = prev.concat(list).slice(0, 4);
      return combined;
    });
    // reset input value so same file can be reselected later
    e.currentTarget.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyTagsFromSheet = (ids: number[]) => {
    setSelectedTagIds(ids);
    setTagSheetOpen(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/support-groups/${groupId}/create-post`)}`);
      return;
    }

    if (!content.trim()) {
      alert("Please enter your thoughts");
      return;
    }

    setLoading(true);
    setRejectionMessage(null);

    try {
      const payload = {
        title: title.trim() || undefined,
        content: content.trim(),
        category: selectedTagIds.length ? selectedTagIds : [],
        files,
      };

      const created = await groupApi.createPost(groupId, payload as any);

      const modStatus = (created?.moderation_status || "").toLowerCase();
      const imageUrl =
        created?.image_url ??
        created?.image ??
        (created?.attachments && created.attachments[0] && (created.attachments[0].url || created.attachments[0].file_url)) ??
        (files && files[0] ? URL.createObjectURL(files[0]) : "");

      const newId = created?.id ?? created?.pk ?? created?._id ?? "";

      if (modStatus === "approved" || modStatus === "approved_by_moderation") {
        const q = new URLSearchParams();
        if (newId) q.set("newPostId", String(newId));
        q.set("success", "1");
        if (imageUrl) q.set("successImage", imageUrl as string);
        router.push(`/group/${groupId}?${q.toString()}`);
        return;
      }

      if (modStatus === "needs_review" || modStatus === "pending" || modStatus === "pending_review") {
        const q = new URLSearchParams();
        if (newId) q.set("newPostId", String(newId));
        q.set("pending", "1");
        router.push(`/group/${groupId}?${q.toString()}`);
        return;
      }

      if (modStatus === "rejected") {
        const reason = created?.moderation_reason ?? "Your post did not meet community guidelines. Please modify and try again.";
        setRejectionMessage(reason);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const q = new URLSearchParams();
      if (newId) q.set("newPostId", String(newId));
      q.set("success", "1");
      if (imageUrl) q.set("successImage", imageUrl as string);
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

  const selectedCategories = categories.filter((c) => selectedTagIds.includes(c.id));

  // Helpers for mobile keyboard: on focus add padding so bottom bar doesn't overlap input
  const onFocusTextarea = () => {
    setKeyboardOpen(true);
    // ensure the textarea is visible
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  };

  const onBlurTextarea = () => {
    // small delay because some mobile keyboards briefly fire blur
    setTimeout(() => setKeyboardOpen(false), 150);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      {/* fixed header */}
      <header className="fixed top-0 left-0 right-0 h-14 flex items-center px-3 border-b border-[#ECECEC] bg-white z-40">
        <button aria-label="Back" onClick={handleBack} className="h-9 w-9 flex items-center justify-center rounded-md" type="button">
          {/* keeping back SVG for simplicity */}
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

      {/* scrollable content area */}
      <main
        ref={mainRef}
        className="flex-1 overflow-auto pt-14 pb-8 px-4"
        style={{ paddingBottom: keyboardOpen ? 260 : undefined }}
      >
        {rejectionMessage && (
          <div className="mb-4 mx-auto p-3 border border-[#F1C0C0] bg-[#FFF5F5] rounded-lg text-sm text-[#7A1F1F]">
            <div className="font-semibold mb-1">Post needs changes</div>
            <div>{rejectionMessage}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setRejectionMessage(null)} className="px-3 py-1 rounded bg-white border text-sm">
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
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
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={6}
              onFocus={onFocusTextarea}
              onBlur={onBlurTextarea}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16AF9F] min-h-[140px] resize-none"
            />
          </div>

          {/* thumbnails */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, idx) => {
                const f = files[idx];
                const isVideo = f?.type?.startsWith?.("video");
                return (
                  <div key={p} className="relative rounded-lg overflow-hidden border border-[#E5E7EB] bg-[#F8FAFB]">
                    {isVideo ? (
                      <video src={p} className="w-full h-24 object-cover" />
                    ) : (
                      <img src={p} alt={`media-${idx}`} className="w-full h-24 object-cover block" />
                    )}

                    <button
                      onClick={() => removeFile(idx)}
                      type="button"
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
                      aria-label="Remove"
                    >
                      {/* keep simple X here; you can replace with Image('/icons/close.svg') if you have it */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M6 6l12 12M6 18L18 6" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {isVideo && (
                      <div className="absolute left-2 bottom-2 bg-black/50 text-white rounded-md px-2 py-0.5 text-xs flex items-center gap-1">
                        {/* you can replace this with Image('/icons/play.svg') if desired */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M5 3v18l15-9L5 3z" fill="white" />
                        </svg>
                        <span className="text-xs">Video</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* tags row - ONLY once, placed above media controls */}
          <div className="flex items-center gap-3 border-t border-b border-[#F1F5F9] py-3">
            <div className="flex items-center gap-2">
              {/* Tag icon using next/image (put your tag.svg in /public/icons/tag.svg) */}
              <div className="w-5 h-5 relative">
                <Image src="/tag.svg" alt="tag icon" width={18} height={18} />
              </div>
            </div>

            <div className="flex-1">
              {/* single button: opens the tag sheet */}
              <button
                type="button"
                onClick={() => setTagSheetOpen(true)}
                className="text-sm text-[#6B7280] text-left w-full"
              >
                {selectedCategories.length === 0 ? (
                  <>
                    What's this post about?{" "}
                    <span className="text-[#16AF9F]">Choose a tag</span>
                  </>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {selectedCategories.map((c) => (
                      <span key={c.id} className="text-sm px-3 py-1 rounded-full bg-[#F0F7FF] border border-[#E7F0FF] text-[#084EA5]">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </div>

            {/* NOTE: removed the right-side duplicate 'Choose a tag' button */}
          </div>

          {/* media controls (no text — only photo/video icons) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={openFilePicker}
              className="inline-flex items-center gap-8 px-3 rounded-lg  bg-white text-sm"
              aria-label="Add media"
            >
              {/* two icons only — use your svg files in /public/icons */}
              <div className="w-7 h-7 relative pt-1">
                <Image src="/video.svg" alt="video" width={28} height={28} />
              </div>
              <div className="w-6 h-6 relative">
                <Image src="/photo.svg" alt="photo" width={24} height={24} />
              </div>
            </button>

            {/* <div className="text-sm text-[#6B7280]">Supports images & video (up to 4)</div> */}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={onFilesSelected} className="hidden" />

          {/* submit remains only in the header — removed bottom submit */}
        </form>
      </main>

      {/* Tag bottom sheet */}
      {tagSheetOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setTagSheetOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl p-4" style={{ boxShadow: "0 -20px 30px rgba(0,0,0,0.12)" }}>
            <div className="w-full max-w-[420px] mx-auto">
              <h4 className="text-[16px] font-semibold text-[#111827] mb-3">Add Tags</h4>

              <div className="space-y-3 max-h-[50vh] overflow-auto pr-2">
                {categories.map((c) => {
                  const checked = selectedTagIds.includes(c.id);
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-3 py-2 border-b border-[#F1F5F9]">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#074EA5]">{c.name}</div>
                        <div className="text-xs text-[#6B7280] mt-1">{c.description}</div>
                      </div>
                      <div className="flex items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleTag(c.id)} className="sr-only" />
                          <span className={`w-10 h-6 flex items-center bg-gray-200 rounded-full p-1 transition ${checked ? "bg-[#16AF9F]" : ""}`} aria-hidden>
                            <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${checked ? "translate-x-4" : ""}`} />
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <button
                  onClick={() => applyTagsFromSheet(selectedTagIds)}
                  className="w-full h-12 rounded-lg text-white font-medium"
                  style={{ background: "linear-gradient(90deg, #18448A 0%, #16AF9F 85%)" }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
