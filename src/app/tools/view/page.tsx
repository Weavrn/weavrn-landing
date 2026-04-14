import { Suspense } from "react";
import ToolViewClient from "./view-client";

export default function ToolViewPage() {
  return (
    <Suspense fallback={<p className="text-center text-weavrn-muted py-20">Loading…</p>}>
      <ToolViewClient />
    </Suspense>
  );
}
