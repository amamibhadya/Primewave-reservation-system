"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ToggleActiveButton({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (active && !window.confirm("Deactivate this resource? It will no longer be bookable (history is kept).")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/resources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !active }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <button className={`btn ${active ? "danger" : ""}`} onClick={onClick} disabled={busy}>
        {active ? "Deactivate" : "Reactivate"}
      </button>
      {error && <div className="alert error" style={{ marginTop: 8 }}>{error}</div>}
    </span>
  );
}
