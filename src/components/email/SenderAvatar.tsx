import { memo, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { getGravatarUrl } from "@/services/contacts/gravatar";
import { getSenderDomainIconUrl } from "@/services/contacts/senderIcon";
import { getCachedAvatar } from "@/services/contacts/avatarCache";
import { useUIStore } from "@/stores/uiStore";

/**
 * Deterministic tint per sender, so a mailbox reads as a set of recognisable
 * correspondents instead of a column of identical grey discs.
 */
const AVATAR_TINTS = [
  "bg-sky-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-orange-600",
] as const;

export function senderTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length]!;
}

interface SenderAvatarProps {
  address: string | null;
  name: string | null;
  /** Rendered instead of the avatar while the row is multi-selected. */
  selected?: boolean;
  sizeClass: string;
  iconSize: number;
  /** Unread rows use the accent tint, matching the previous behaviour. */
  emphasise?: boolean;
}

/**
 * Sender avatar: Gravatar when the address has one, initials otherwise.
 *
 * The image is requested directly with `d=404`, so a sender without a Gravatar
 * simply fails to load and falls back — no probing request per row. Readers who
 * would rather not reach Gravatar at all can turn avatars off in Settings, in
 * which case only initials are drawn.
 */
export const SenderAvatar = memo(function SenderAvatar({
  address,
  name,
  selected = false,
  sizeClass,
  iconSize,
  emphasise = false,
}: SenderAvatarProps) {
  const showAvatars = useUIStore((s) => s.showSenderAvatars);

  const initial = (name?.[0] ?? address?.[0] ?? "?").toUpperCase();

  // Sources in order of how well they identify the person: the photo Google
  // already has for them, then a Gravatar, then their organisation's icon,
  // then initials. Each failure advances the stage.
  const sources = useMemo(() => {
    if (!address || !showAvatars) return [] as string[];
    return [
      getCachedAvatar(address),
      getGravatarUrl(address),
      getSenderDomainIconUrl(address),
    ].filter((url): url is string => url !== null);
  }, [address, showAvatars]);

  const [stage, setStage] = useState(0);
  // A recycled row shows a different sender, so start over
  useEffect(() => { setStage(0); }, [address, showAvatars]);

  const currentSource = sources[stage] ?? null;

  if (selected) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-accent font-medium text-white ${sizeClass}`}
      >
        <Check size={iconSize} />
      </div>
    );
  }

  if (currentSource) {
    return (
      <img
        key={currentSource}
        src={currentSource}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setStage((s) => s + 1)}
        className={`shrink-0 rounded-full bg-white object-contain ${sizeClass}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-medium text-white ${sizeClass} ${
        emphasise ? "bg-accent" : senderTint(address ?? name ?? "?")
      }`}
    >
      {initial}
    </div>
  );
});
