"use client";

import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { apiGet, apiPut, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SettingsMap {
  [key: string]: {
    value: unknown;
    description: string | null;
  };
}

export default function PengaturanPage() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const s = await apiGet<SettingsMap>("/admin/settings");
      setSettings(s);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: string) {
    setBusy(key);
    try {
      const raw = edits[key];
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw; // simpan sebagai string JSON
      }
      await apiPut(`/admin/settings/${key}`, parsed);
      toast.success(`Setting "${key}" tersimpan`);
      setEdits((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi runtime platform (tanpa deploy ulang)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settings === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-5 w-32 mb-3" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))
          : Object.entries(settings).map(([key, meta]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-sm">{key}</CardTitle>
                  {meta.description && (
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      value={
                        edits[key] !== undefined
                          ? edits[key]
                          : JSON.stringify(meta.value)
                      }
                      onChange={(e) => setEdits({ ...edits, [key]: e.target.value })}
                      className="font-mono text-xs"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={edits[key] === undefined || busy === key}
                      onClick={() => save(key)}
                    >
                      <Save className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
