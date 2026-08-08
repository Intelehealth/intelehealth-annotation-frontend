"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AnalyticsPageRedirect() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.datasetId as string;

  useEffect(() => {
    router.replace(`/dataset/${datasetId}/annotation?view=dataset-analytics`);
  }, [datasetId, router]);

  return null;
}