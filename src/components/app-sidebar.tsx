"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  MessageCircleQuestion,
  BookOpenText,
  BookMarked,
  Newspaper,
  Settings,
  ScrollText,
  Sparkles,
  Bike,
  Wallet,
  Star,} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const mainNav = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Pengguna", icon: Users, href: "/pengguna" },
  // HIDDEN (per user 15Sep): Hafalan & Tanya Ustadz — halaman tetap ada, cukup hapus
  // komentar baris di bawah utk menampilkan kembali:
  // { label: "Hafalan", icon: GraduationCap, href: "/hafalan" },
  // { label: "Tanya Ustadz", icon: MessageCircleQuestion, href: "/tanya" },
  { label: "Khatmil", icon: BookOpenText, href: "/khatmil" },
];

const layananNav = [
  { label: "Kunjungan", icon: Bike, href: "/visits" },
  { label: "Pembayaran", icon: Wallet, href: "/payments" },
  { label: "Review", icon: Star, href: "/reviews" },
];

const kontenNav = [
  { label: "Materi", icon: BookMarked, href: "/materi" },
  { label: "CMS", icon: Newspaper, href: "/cms" },
];

const sistemNav = [
  { label: "Audit Log", icon: ScrollText, href: "/pengaturan/audit" },
  { label: "Pengaturan", icon: Settings, href: "/pengaturan" },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            MQ
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">MQ Admin</div>
            <div className="text-xs text-muted-foreground">Mujayarotul Faqih</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive(item.href)}>
                      <item.icon />
                      <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Pesan Ustadz</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {layananNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive(item.href)}>
                      <item.icon />
                      <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Konten</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {kontenNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive(item.href)}>
                      <item.icon />
                      <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Sistem</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sistemNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive(item.href)}>
                      <item.icon />
                      <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
