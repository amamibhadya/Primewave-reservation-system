"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Resource, ResourceType } from "@/lib/types";

export default function ResourceForm({ types, resource }: { types: ResourceType[]; resource?: Resource }) {
  const router = useRouter();
  const [typeList, setTypeList] = useState(types);
  const [typeId, setTypeId] = useState<string>(String(resource?.type_id ?? types[0]?.id ?? ""));
  const [newType, setNewType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addType() {
    if (!newType.trim()) return;
    const res = await fetch("/api/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newType }),
    });
    const j = await res.json();
    if (!res.ok) return setError(j.error);
    setTypeList((t) => [...t, j.data].sort((a, b) => a.name.localeCompare(b.name)));
    setTypeId(String(j.data.id));
    setNewType("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"),
      type_id: typeId,
      location: f.get("location"),
      capacity: f.get("capacity"),
      description: f.get("description"),
    };
    const res = await fetch(resource ? `/api/resources/${resource.id}` : "/api/resources", {
      method: resource ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setError(j.error ?? "Could not save");
    router.push(`/resources/${j.data.id}`);
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {error && <div className="alert error">{error}</div>}
      <label>
        Name
        <input name="name" required maxLength={100} defaultValue={resource?.name} placeholder="e.g. Boardroom" />
      </label>
      <div className="row">
        <label>
          Type
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
            {typeList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Add a new type <span className="field-hint">(optional)</span>
          <span style={{ display: "flex", gap: 6 }}>
            <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="e.g. Lab" />
            <button type="button" className="btn" onClick={addType}>
              Add
            </button>
          </span>
        </label>
      </div>
      <div className="row">
        <label>
          Location
          <input name="location" maxLength={100} defaultValue={resource?.location ?? ""} placeholder="e.g. Floor 3" />
        </label>
        <label>
          Capacity <span className="field-hint">(people / seats)</span>
          <input name="capacity" type="number" min={1} required defaultValue={resource?.capacity ?? 1} />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" rows={3} maxLength={500} defaultValue={resource?.description ?? ""} />
      </label>
      <div className="actions">
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : resource ? "Save changes" : "Create resource"}
        </button>
        <button type="button" className="btn" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
