"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar user: foto presigned (photo_url) dengan fallback inisial.
 * Dipakai di list pengguna/santri/ustadz.
 */
export function UserAvatar({
  photoUrl,
  name,
  className,
}: {
  photoUrl?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const show = photoUrl && !broken;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-bold text-muted-foreground",
        className ?? "size-8",
      )}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name ?? "foto"}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}
