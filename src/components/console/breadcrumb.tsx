"use client";

import { usePathname } from "next/navigation";

// Folder-navigator style: "/console" -> "Home", "/console/tools/image" ->
// "Tools > Image", "/console/account/plan" -> "Account > Plan".
function segmentLabel(segment: string): string {
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function ConsoleBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.replace(/^\/console\/?/, "").split("/").filter(Boolean);

  if (parts.length === 0) {
    return <span>Home</span>;
  }

  return (
    <span className="flex items-center gap-1.5">
      {parts.map((part, i) => (
        <span key={part} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground">/</span>}
          <span className={i === parts.length - 1 ? "text-foreground" : "text-muted-foreground"}>
            {segmentLabel(part)}
          </span>
        </span>
      ))}
    </span>
  );
}
