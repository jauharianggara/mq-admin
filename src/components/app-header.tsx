"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { logout, me, type MqUser } from "@/lib/auth";

const segmentLabels: Record<string, string> = {
  pengguna: "Pengguna",
  hafalan: "Hafalan",
  tanya: "Tanya Ustadz",
  khatmil: "Khatmil",
  materi: "Materi",
  cms: "CMS",
  pengaturan: "Pengaturan",
  audit: "Audit Log",
};

export function AppHeader() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<MqUser | null>(null);

  useEffect(() => {
    me().then(setUser);
  }, []);

  const segments = pathname.split("/").filter(Boolean);
  const label = segmentLabels[segments[0] ?? ""] ?? (segments[0] ? decodeURIComponent(segments[0]) : "Dashboard");

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Ganti tema"
        >
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
        </Button>
        <Separator orientation="vertical" className="!h-4" />
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {(user?.full_name ?? user?.email ?? "A").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm text-muted-foreground">
            {user?.full_name ?? user?.email ?? "Admin"}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Keluar">
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
