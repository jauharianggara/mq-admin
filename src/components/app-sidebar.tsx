"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookUser,
  MessageCircleQuestion,
  BookOpenText,
  Settings,
  ScrollText,
  Sparkles,
  Bike,
  Wallet,
  Landmark,
  Coins,
  Star,
  BellRing,
  HandCoins,
} from "lucide-react";

import { me } from "@/lib/auth";

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
  { label: "Santri", icon: GraduationCap, href: "/santri" },
  { label: "Ustadz", icon: BookUser, href: "/ustadz" },
  { label: "Pengguna", icon: Users, href: "/pengguna" },
  { label: "Notifikasi", icon: BellRing, href: "/notifikasi" },
  // HIDDEN (per user 15Sep): Hafalan & Tanya Ustadz — halaman tetap ada, cukup hapus
  // komentar baris di bawah utk menampilkan kembali:
  // { label: "Hafalan", icon: GraduationCap, href: "/hafalan" },
  // { label: "Tanya Ustadz", icon: MessageCircleQuestion, href: "/tanya" },
  { label: "Khatmil", icon: BookOpenText, href: "/khatmil" },
];

const layananNav = [
  { label: "Kunjungan", icon: Bike, href: "/visits" },
  { label: "Pembayaran", icon: Wallet, href: "/payments" },
  { label: "Penarikan", icon: Landmark, href: "/payouts" },
  { label: "Saldo", icon: Coins, href: "/deposit" },
  { label: "Review", icon: Star, href: "/reviews" },
];;

const sistemNav = [
  { label: "Penerima Infaq", icon: Users, href: "/penerima" },
  { label: "Rekap Infaq", icon: Coins, href: "/rekap-infaq" },
  { label: "Pembagian Infaq", icon: HandCoins, href: "/pengaturan/pembagian-infaq" },
  { label: "Audit Log", icon: ScrollText, href: "/pengaturan/audit" },
  { label: "Pengaturan", icon: Settings, href: "/pengaturan" },
];

// Menu khusus role PENERIMA (penerima infaq yang login panel admin) —
// mereka TIDAK boleh melihat menu admin lain.
const penerimaNav = [
  { label: "Infaq Saya", icon: HandCoins, href: "/infaq-saya" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [penerimaOnly, setPenerimaOnly] = useState(false);

  useEffect(() => {
    me().then((u) =>
      setPenerimaOnly(
        !!u?.roles?.includes("PENERIMA") &&
          !u.roles.some((r) => ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(r)),
      ),
    );
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  if (penerimaOnly) {
    return (
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo MQ" className="size-8 rounded-md object-cover" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">MQ Admin</div>
              <div className="text-xs text-muted-foreground">Infaq Penerima</div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Infaq</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {penerimaNav.map((item) => (
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

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo MQ" className="size-8 rounded-md object-cover" />
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
