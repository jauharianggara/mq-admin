"use client";

import { useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  BookOpenText,
  MessageCircleQuestion,
  Clock,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  users: { active: number; santri_active: number; ustadz_verified: number };
  memorization: { total: number; pending: number; passed: number; avg_review_minutes: number | null };
  khatmil: { campaigns_active: number; juz_completed: number };
  questions: { total: number; answered: number; published: number; avg_answer_minutes: number | null };
  activity_series_7d: { date: string; events: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<DashboardData>("/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>;
  }

  const kpis = data
    ? [
        {
          title: "Santri Aktif",
          value: data.users.santri_active,
          sub: `${data.users.active} pengguna aktif`,
          icon: Users,
        },
        {
          title: "Setoran Hafalan",
          value: data.memorization.total,
          sub: `${data.memorization.passed} lulus · ${data.memorization.pending} menunggu`,
          icon: GraduationCap,
        },
        {
          title: "Khatmil",
          value: data.khatmil.juz_completed,
          sub: `${data.khatmil.campaigns_active} campaign aktif · juz selesai`,
          icon: BookOpenText,
        },
        {
          title: "Pertanyaan",
          value: data.questions.total,
          sub: `${data.questions.answered} dijawab · ${data.questions.published} publik`,
          icon: MessageCircleQuestion,
        },
      ]
    : [];

  const max = data ? Math.max(...data.activity_series_7d.map((d) => d.events), 1) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan platform MQ Mujayarotul Faqih
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data
          ? kpis.map((k) => (
              <Card key={k.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {k.title}
                  </CardTitle>
                  <k.icon className="size-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{k.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                </CardContent>
              </Card>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktivitas 7 Hari</CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <div className="flex h-40 items-end gap-2">
                {data.activity_series_7d.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary/80 min-h-[2px]"
                      style={{ height: `${(d.events / max) * 120}px` }}
                      title={`${d.events} event`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data ? (
              <>
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      Rata-rata review setoran:{" "}
                      {data.memorization.avg_review_minutes !== null
                        ? `${Math.round(data.memorization.avg_review_minutes)} menit`
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      dari submitted sampai reviewed
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      Rata-rata jawab pertanyaan:{" "}
                      {data.questions.avg_answer_minutes !== null
                        ? `${Math.round(data.questions.avg_answer_minutes)} menit`
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      dari ditanya sampai dijawab
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="size-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      Ustadz terverifikasi: {data.users.ustadz_verified}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      aktif mereview & menjawab
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
