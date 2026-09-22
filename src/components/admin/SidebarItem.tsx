import { memo } from "react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export const SidebarItem = memo(function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all group",
        active 
          ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
          : "text-gray-500 hover:bg-gray-50 hover:text-primary"
      )}
    >
      <span className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-gray-400 group-hover:text-primary")}>
        {icon}
      </span>
      {label}
    </button>
  );
});
