"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

import { Campaign, CampaignForm } from "../../shared";

export default function KhatmilEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Campaign>(`/khatmil/campaigns/${id}`)
      .then(setCampaign)
      .catch(() => router.push("/khatmil"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 py-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <CampaignForm editing={campaign} onDone={() => router.push(`/khatmil/${id}`)} />;
}
