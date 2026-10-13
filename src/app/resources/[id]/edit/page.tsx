import { notFound } from "next/navigation";
import ResourceForm from "@/components/ResourceForm";
import { getResource, listTypes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditResource({ params }: { params: Promise<{ id: string }> }) {
  const resource = await getResource(Number((await params).id));
  if (!resource) notFound();
  return (
    <>
      <div className="page-head"><h1>Edit {resource.name}</h1></div>
      <div className="card" style={{ maxWidth: 680 }}><ResourceForm types={await listTypes()} resource={resource} /></div>
    </>
  );
}
