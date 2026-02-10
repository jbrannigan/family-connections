"use client";

import Image from "next/image";

const sizePx = { sm: 32, md: 40, lg: 80 } as const;

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

interface UserAvatarProps {
  url: string | null | undefined;
  name: string | null | undefined;
  size?: keyof typeof sizeClasses;
}

/**
 * Displays a user avatar image or falls back to an initial letter circle.
 */
export default function UserAvatar({ url, name, size = "sm" }: UserAvatarProps) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  const classes = sizeClasses[size];
  const px = sizePx[size];

  if (url) {
    return (
      <Image
        src={url}
        alt={name ?? "User avatar"}
        width={px}
        height={px}
        className={`${classes} shrink-0 rounded-full object-cover`}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`${classes} flex shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-white/60`}
    >
      {initial}
    </div>
  );
}
