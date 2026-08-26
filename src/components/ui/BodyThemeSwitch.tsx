import { Sun, SunDim, Moon } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useStatusToastStore } from "@/stores/statusToastStore";

/**
 * How message bodies are painted, cycled from the title bar so it is reachable
 * whether or not a thread is open. HTML mail is authored on white, which is
 * what makes it glare in a dark room; "dim" keeps the sender's colours and
 * only pulls the brightness down, "dark" inverts outright.
 */
export function BodyThemeSwitch() {
  const emailBodyTheme = useUIStore((s) => s.emailBodyTheme);
  const toggle = useUIStore((s) => s.toggleEmailBodyTheme);
  const showToast = useStatusToastStore((s) => s.showToast);

  const announce = () => {
    toggle();
    // Read the value the store just committed, not the stale render-time one
    const next = useUIStore.getState().emailBodyTheme;
    showToast({
      light: "Message bodies: original brightness",
      dim: "Message bodies: dimmed — colours kept, glare reduced",
      dark: "Message bodies: dark — inverted, photos kept true",
    }[next]);
  };

  const { Icon, label, tint } = {
    light: { Icon: Sun, label: "Message bodies: bright", tint: "text-sidebar-text/40" },
    dim: { Icon: SunDim, label: "Message bodies: dimmed", tint: "text-accent/80" },
    dark: { Icon: Moon, label: "Message bodies: dark", tint: "text-accent" },
  }[emailBodyTheme];

  return (
    <button
      onClick={announce}
      title={`${label} — click to change`}
      aria-label={`${label}. Click to change.`}
      className="flex shrink-0 items-center rounded px-1.5 py-1 transition-colors hover:bg-sidebar-hover"
    >
      <Icon size={13} className={tint} />
    </button>
  );
}
