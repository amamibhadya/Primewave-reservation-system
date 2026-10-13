import ResourceForm from "@/components/ResourceForm";
import { listTypes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewResource() {
  return (
    <>
      <div className="page-head"><h1>Add resource</h1></div>
      <div className="card" style={{ maxWidth: 680 }}><ResourceForm types={await listTypes()} /></div>
    </>
  );
}
