"use client";

import { useRouter } from "next/navigation";

import { CampaignForm } from "../shared";

export default function KhatmilBaruPage() {
  const router = useRouter();
  return <CampaignForm editing={null} onDone={() => router.push("/khatmil")} />;
}
