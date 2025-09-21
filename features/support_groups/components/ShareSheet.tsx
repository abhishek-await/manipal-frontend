"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export type ShareData = {
  title: string;
  excerpt?: string;
  tags?: string[];
  url: string;
  sourceLogo?: string; // e.g. "/mcc-logo.png"
  sourceText?: string; // e.g. "Shared from Manipal Community Connect"
};

export default function ShareSheet({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: ShareData | null;
}) {
  if (!data) return null;

  const {
    title,
    excerpt,
    tags = [],
    url,
    sourceLogo = "/mcc-logo.png",
    sourceText = "Shared from Manipal Community Connect",
  } = data;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback for older browsers
      const input = document.createElement("input");
      input.type = "text";
      input.value = url;
      // put offscreen so not visible
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      input.setSelectionRange(0, 99999); // mobile support
      try {
        document.execCommand("copy");
      } catch {
        // ignore
      }
      document.body.removeChild(input);
    }
    onClose();
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: excerpt || title,
          url,
        });
        onClose();
        return true;
      } catch {
        // user cancelled or failed
      }
    }
    return false;
  };

  const shareWhatsApp = async () => {
    const ok = await shareNative();
    if (ok) return;
    const msg = encodeURIComponent(`${title}\n\n${excerpt || ""}\n${url}`);
    // prefer wa.me, fallback to web API if needed
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
    // optionally: if popup blocked, open in same tab (or provide visual hint)
    onClose();
  };


  const shareMessages = async () => {
    const ok = await shareNative();
    if (ok) return;
    const body = encodeURIComponent(`${title}\n\n${excerpt || ""}\n${url}`);
    // sms: works on mobile only; desktop will try but often nothing happens
    window.location.href = `sms:?&body=${body}`;
    onClose();
  };

  const shareGmail = async () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${excerpt || ""}\n\n${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
    onClose();
  };

  const shareInstagram = async () => {
    // Instagram doesn't accept plain text share reliably. Copy link and instruct user to paste.
    await copyToClipboard();
  };

  const recents = [
    { name: "Pavan", avatar: "/avatars/p1.png" },
    { name: "My Status", avatar: "/wa-status.svg" },
    { name: "Person 1", avatar: "/avatars/p2.png" },
    { name: "Person 2", avatar: "/avatars/p3.png" },
    { name: "Person 3", avatar: "/avatars/p4.png" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[99] bg-black/30"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* sheet */}
          <motion.div
            key="sheet"
            className="fixed left-0 right-0 bottom-0 z-[100]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            // prevent clicks inside sheet from closing via backdrop
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Share link"
          >
            <div className="mx-auto w-full max-w-[420px] px-3">
              <div className="rounded-t-[12px] bg-white shadow-[0_-20px_30px_rgba(0,0,0,0.12)] p-4">
                {/* Handle */}
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />

                <div className="text-[16px] font-semibold text-[#333]">Sharing Link</div>

                {/* Preview card */}
                <div className="mt-3 rounded-[10px] border border-[#E5E7EB] p-3">
                  <div className="text-[14px] font-semibold text-[#111827] line-clamp-2">{title}</div>
                  {excerpt ? (
                    <div className="mt-1 text-[13px] text-[#4B5563] line-clamp-2">{excerpt}</div>
                  ) : null}

                  {tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.slice(0, 2).map((t, i) => (
                        <span
                          key={`${t}-${i}`}
                          className="inline-block rounded-full bg-[#F3F4F6] px-3 py-1 text-[11px] text-[#111827]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* source row */}
                  <div className="mt-3 border-t pt-2 flex items-center gap-2">
                    <Image src={sourceLogo} alt="source" width={28} height={28} className="rounded" />
                    <div className="text-[12px] text-[#4B5563]">{sourceText}</div>
                  </div>
                </div>

                {/* Share with (recents) */}
                {/* <div className="mt-4">
                  <div className="text-[14px] font-medium text-[#111827]">Share with</div>
                  <div className="mt-3 flex items-center gap-4 overflow-x-auto pb-1">
                    {recents.map((r, idx) => (
                      <div key={idx} className="flex flex-col items-center min-w-[56px]">
                        <div className="relative h-12 w-12">
                          <Image src={r.avatar} alt={r.name} fill className="rounded-full object-cover border" />
                          {/* small WA badge example */}
                          {/* <div className="absolute -bottom-0 -right-0 h-5 w-5 rounded-full bg-white flex items-center justify-center shadow">
                            <Image src="/whatsapp.svg" alt="wa" width={16} height={16} />
                          </div>
                        </div>
                        <div className="mt-2 w-14 truncate text-center text-[11px] text-[#374151]">{r.name}</div>
                      </div>
                    ))}
                  </div>
                </div> */}

                {/* Actions grid */}
                <div className="mt-4 grid grid-cols-4 gap-y-4">
                  <Action icon="/copy-link.svg" label="Copy Link" onClick={copyToClipboard} />
                  <Action icon="/whatsapp.svg" label="WhatsApp" onClick={shareWhatsApp} />
                  <Action icon="/messages.svg" label="Messages" onClick={shareMessages} />
                  <Action icon="/gmail.svg" label="Gmail" onClick={shareGmail} />
                  <Action icon="/instagram.svg" label="Instagram" onClick={shareInstagram} />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Action({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded px-2 py-1 text-center"
      aria-label={label}
      type="button"
    >
      <div className="h-12 w-12">
        <Image src={icon} alt={label} width={48} height={48} />
      </div>
      <div className="text-[11px] text-[#374151]">{label}</div>
    </button>
  );
}
