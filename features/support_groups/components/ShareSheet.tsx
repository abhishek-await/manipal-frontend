"use client";

import React, { useEffect, useRef, useState } from "react";
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
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  data: ShareData | null;
  /** optional callback fired when a share action completes */
  onShared?: (method: string) => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      // trap scroll
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // focus
      requestAnimationFrame(() => closeButtonRef.current?.focus());
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }
  }, [open, onClose]);

  if (!data) return null;

  const { title, excerpt, tags = [], url, sourceLogo = "/mcc-logo.png", sourceText = "Shared from Manipal Community Connect" } = data;

  const setTransient = (msg: string, ms = 1400) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), ms);
  };

  // native share helper (used as a fallback)
  const tryNativeShare = async () => {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title, text: excerpt || title, url });
      onShared?.("native");
      setTransient("Shared");
      onClose();
      return true;
    } catch (e) {
      return false;
    }
  };

  const copyToClipboard = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "absolute";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        input.setSelectionRange(0, 99999);
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setTransient("Link copied");
      onShared?.("copy");
      setTimeout(() => {
        setBusy(false);
        onClose();
      }, 600);
    } catch (err) {
      setTransient("Couldn't copy");
      setBusy(false);
    }
  };

  const openWindow = (href: string, newTab = true) => {
    const opts = "noopener,noreferrer";
    if (newTab) return window.open(href, "_blank", opts);
    else {
      window.location.href = href;
      return null;
    }
  };

  // Specific-first share implementations. If opening the specific channel fails (popup blocked
  // or returns null), we fall back to the native share API if available.

  const shareWhatsApp = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const msg = encodeURIComponent(`${title}

${excerpt || ""}

${url}`);
      const win = openWindow(`https://wa.me/?text=${msg}`);
      if (!win) {
        // popup blocked or not available — try native as a fallback
        const ok = await tryNativeShare();
        if (!ok) setTransient("Couldn't open WhatsApp");
        setBusy(false);
        return;
      }
      onShared?.("whatsapp");
      setTransient("Opened WhatsApp");
      setTimeout(() => {
        setBusy(false);
        onClose();
      }, 600);
    } catch (e) {
      const ok = await tryNativeShare();
      if (!ok) setTransient("Couldn't share");
      setBusy(false);
    }
  };

  const shareMessages = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // SMS navigation usually works on mobile. We'll attempt it first.
      const body = encodeURIComponent(`${title}

${excerpt || ""}
${url}`);
      openWindow(`sms:?&body=${body}`, false);
      onShared?.("sms");
      setTransient("Opened messages");
      setTimeout(() => {
        setBusy(false);
        onClose();
      }, 600);
    } catch (e) {
      const ok = await tryNativeShare();
      if (!ok) setTransient("Couldn't open messages");
      setBusy(false);
    }
  };

  const shareGmail = async () => {
  if (busy) return;
  setBusy(true);

  const subject = encodeURIComponent(title);
  const body = encodeURIComponent(`${excerpt || ""}\n\n${url}`);

  const mailto = `mailto:?subject=${subject}&body=${body}`;

  try {
    // 1) Preferred: create an anchor and click it (works in most browsers)
    const a = document.createElement("a");
    a.href = mailto;
    a.style.display = "none";
    // do NOT set target/_blank for mailto; using native navigation is more reliable
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onShared?.("email");
    setTransient("Opened mail client");
    setTimeout(() => {
      setBusy(false);
      onClose();
    }, 600);
    return;
  } catch (err) {
    // fallthrough to try native share
  }

  // 2) Fallback: try navigator.share if available
  try {
    
      const ok = await tryNativeShare();
      if (ok) {
        setBusy(false);
        return;
      }
  } catch (_) {
    // ignore
  }

  // 3) Last resort: copy body to clipboard and instruct user
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(`${title}\n\n${excerpt || ""}\n\n${url}`);
      setTransient("Mail content copied — paste into your mail client");
    } else {
      // older fallback
      const ta = document.createElement("textarea");
      ta.value = `${title}\n\n${excerpt || ""}\n\n${url}`;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setTransient("Mail content copied — paste into your mail client");
    }
  } catch (e) {
    setTransient("Couldn't open mail client");
  } finally {
    setBusy(false);
  }
};


  const shareTwitter = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const text = encodeURIComponent(`${title} ${excerpt ? `- ${excerpt}` : ""}`);
      const win = openWindow(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`);
      if (!win) {
        const ok = await tryNativeShare();
        if (!ok) setTransient("Couldn't open Twitter");
        setBusy(false);
        return;
      }
      onShared?.("twitter");
      setTransient("Opened Twitter");
      setTimeout(() => {
        setBusy(false);
        onClose();
      }, 600);
    } catch (e) {
      const ok = await tryNativeShare();
      if (!ok) setTransient("Couldn't share");
      setBusy(false);
    }
  };

  const shareLinkedIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const win = openWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
      if (!win) {
        const ok = await tryNativeShare();
        if (!ok) setTransient("Couldn't open LinkedIn");
        setBusy(false);
        return;
      }
      onShared?.("linkedin");
      setTransient("Opened LinkedIn");
      setTimeout(() => {
        setBusy(false);
        onClose();
      }, 600);
    } catch (e) {
      const ok = await tryNativeShare();
      if (!ok) setTransient("Couldn't share");
      setBusy(false);
    }
  };

  const shareInstagram = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Instagram web doesn't accept plain text share reliably. Try copying first.
      await copyToClipboard();
      // copyToClipboard closes the sheet after a short delay, so we don't immediately close here.
      onShared?.("instagram");
      setTransient("Link copied — paste in Instagram");
      setBusy(false);
    } catch (e) {
      const ok = await tryNativeShare();
      if (!ok) setTransient("Couldn't share to Instagram");
      setBusy(false);
    }
  };

  return (
    <div aria-hidden={!open}>
      {/* backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[99] bg-black/30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* sheet */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          className="fixed left-0 right-0 bottom-0 z-[100]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto w-full max-w-[420px] px-3">
            <div className="rounded-t-[12px] bg-white shadow-[0_-20px_30px_rgba(0,0,0,0.12)] p-4">
              <div className="flex items-start justify-between">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />
                <button
                  aria-label="Close share"
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="-mt-2 -mr-2 rounded p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              <div id="share-title" className="text-[16px] font-semibold text-[#333]">Share</div>

              <div className="mt-3 rounded-[10px] border border-[#E5E7EB] p-3">
                <div className="text-[14px] font-semibold text-[#111827] line-clamp-2">{title}</div>
                {excerpt ? <div className="mt-1 text-[13px] text-[#4B5563] line-clamp-2">{excerpt}</div> : null}

                {tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.slice(0, 2).map((t, i) => (
                      <span key={`${t}-${i}`} className="inline-block rounded-full bg-[#F3F4F6] px-3 py-1 text-[11px] text-[#111827]">{t}</span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 border-t pt-2 flex items-center gap-2">
                  <Image src={sourceLogo} alt="source" width={28} height={28} className="rounded" />
                  <div className="text-[12px] text-[#4B5563]">{sourceText}</div>
                </div>
              </div>

              {/* feedback */}
              {feedback ? <div className="mt-3 text-sm text-center text-[#111827]">{feedback}</div> : null}

              {/* Actions grid */}
              <div className="mt-4 grid grid-cols-4 gap-y-4">
                <Action icon="/copy-link.svg" label="Copy" onClick={copyToClipboard} disabled={busy} />
                <Action icon="/whatsapp.svg" label="WhatsApp" onClick={shareWhatsApp} disabled={busy} />
                <Action icon="/messages.svg" label="Messages" onClick={shareMessages} disabled={busy} />
                <Action icon="/gmail.svg" label="Gmail" onClick={shareGmail} disabled={busy} />
                <Action icon="/twitter.svg" label="Twitter" onClick={shareTwitter} disabled={busy} />
                <Action icon="/linkedin.svg" label="LinkedIn" onClick={shareLinkedIn} disabled={busy} />
                <Action icon="/instagram.svg" label="Instagram" onClick={shareInstagram} disabled={busy} />
                <Action icon="/share-native.svg" label="Native" onClick={async () => { setBusy(true); const ok = await tryNativeShare(); if (!ok) setTransient('Native share not available'); setBusy(false); }} disabled={busy} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Action({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void | Promise<void>; disabled?: boolean; }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); if (disabled) return; onClick(); }}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded px-2 py-1 text-center"
      aria-label={label}
      type="button"
      disabled={disabled}
    >
      <div className="h-12 w-12 relative">
        {/* using next/image keeps previous behaviour for local assets */}
        <Image src={icon} alt={label} width={48} height={48} />
      </div>
      <div className="text-[11px] text-[#374151]">{label}</div>
    </button>
  );
}
