"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CancelButton({ id, label }: { id: number; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const reason = window.prompt(`Cancel "${label}"?\n\nOptional reason (leave empty for none). Press OK to cancel the reservation.`);
    if (reason === null) return; // user dismissed the dialog
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/reservations/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not cancel");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <button className="btn danger sm" onClick={onClick} disabled={busy}>
        {busy ? "Cancelling…" : "Cancel"}
      </button>
      {error && <div className="small" style={{ color: "var(--red)" }}>{error}</div>}
    </span>
  );
}
