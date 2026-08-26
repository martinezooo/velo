import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  /** Optional quiet line under the text — used for the product line on the
   *  one empty state a reader sees often, a cleared inbox. */
  footer?: ReactNode;
} & (
  | { icon: LucideIcon; illustration?: never }
  | { illustration: ComponentType<{ size?: number; className?: string }>; icon?: never }
);

export function EmptyState({ title, subtitle, footer, ...rest }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      {"illustration" in rest && rest.illustration ? (
        <rest.illustration size={132} className="mb-6 opacity-50" />
      ) : "icon" in rest && rest.icon ? (
        (() => {
          const Icon = rest.icon;
          return <Icon size={40} strokeWidth={1.25} className="mb-4 text-text-tertiary opacity-35" />;
        })()
      ) : null}
      <p className="text-[0.9375rem] font-medium text-text-secondary">{title}</p>
      {subtitle && (
        <p className="mt-1.5 max-w-[22rem] text-xs leading-relaxed text-text-tertiary">
          {subtitle}
        </p>
      )}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  );
}

/** The product line, styled to stay in the background. */
export function EmptyStateTagline() {
  return (
    <span className="text-[0.625rem] uppercase tracking-[0.18em] text-text-tertiary/60">
      One inbox for all
    </span>
  );
}
