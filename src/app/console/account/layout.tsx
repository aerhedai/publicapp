import { AccountSidebar } from "@/components/console/account-sidebar";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <AccountSidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
