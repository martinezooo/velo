import logoUrl from "@/assets/logo.svg";

/**
 * Product mark at the top of the sidebar. Collapsed sidebars keep the mark and
 * drop the wordmark, so the column still reads as Revelo at 64px wide.
 */
export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={`flex items-center pt-3 pb-1 ${collapsed ? "justify-center px-2" : "gap-2.5 px-4"}`}
    >
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className={`shrink-0 rounded-[7px] ${collapsed ? "h-7 w-7" : "h-6 w-6"}`}
      />
      {!collapsed && (
        <span className="text-[0.9375rem] font-semibold tracking-tight text-sidebar-text">
          Revelo
        </span>
      )}
    </div>
  );
}
