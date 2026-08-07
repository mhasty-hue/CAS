import type { DocumentRow, OrderRow, ReportSubmissionRow, UserProfileRow } from "@/types/database";
import type { CasSupabaseClient } from "@/lib/supabase";
import { mapReportSubmission } from "@/lib/storage/mappers";
import { authenticatedStorageClient, jsonError } from "@/lib/storage/server";

export const runtime = "nodejs";

async function rows<T>(label: string, query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
}

async function single<T>(label: string, query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (!result.data) throw new Error(`${label}: no matching record was found.`);
  return result.data;
}

async function updateOrderStatus(client: CasSupabaseClient, orderId: string) {
  const ordersTable = client.from("orders") as unknown as {
    update: (values: Partial<OrderRow>) => {
      eq: (column: "id", value: string) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
  const result = await ordersTable.update({ status: "Submitted", updated_at: new Date().toISOString() }).eq("id", orderId);
  if (result.error) throw new Error(`Update order status: ${result.error.message}`);
}

export async function POST(request: Request) {
  try {
    const { client, userId, userEmail } = await authenticatedStorageClient(request);
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!orderId) return jsonError("Choose an order before submitting the report package.");

    const order = await single<OrderRow>("Load order for report submission", client.from("orders").select("*").eq("id", orderId).maybeSingle());
    const documents = await rows<DocumentRow>(
      "Load stored report package",
      client
        .from("documents")
        .select("*")
        .eq("organization_id", order.organization_id)
        .eq("order_id", orderId)
        .in("category", ["Appraisal report PDF", "Appraisal XML", "ENV file", "UAD 3.6 data package", "Workfile", "Photos", "Sketch"])
    );
    const activeDocuments = documents.filter((document) => !document.archived_at && !document.deleted_at && document.status !== "Failed upload");
    const reportPdf = activeDocuments.find((document) => document.category === "Appraisal report PDF");
    if (!reportPdf) throw new Error("Upload the report PDF before submitting to review.");

    const profileRows = await rows<UserProfileRow>("Load submitter profile", client.from("user_profiles").select("*").eq("id", userId).limit(1));
    const submitterName = profileRows[0]?.full_name ?? userEmail ?? userId;
    const submission = await single<ReportSubmissionRow>(
      "Create report submission",
      client
        .from("report_submissions")
        .insert({
          organization_id: order.organization_id,
          order_id: orderId,
          submitted_by: userId,
          submitted_by_name: submitterName,
          report_pdf_document_id: reportPdf.id,
          xml_document_id: activeDocuments.find((document) => document.category === "Appraisal XML")?.id,
          env_document_id: activeDocuments.find((document) => document.category === "ENV file")?.id,
          supporting_document_ids: activeDocuments
            .filter((document) => ["UAD 3.6 data package", "Workfile", "Photos", "Sketch"].includes(document.category ?? ""))
            .map((document) => document.id),
          submission_note: "Submitted from CAS secure storage workflow.",
          certification_accepted: true,
          status: "Submitted",
          metadata: {
            storageMode: "private-supabase-storage",
            sourceDocumentIds: activeDocuments.map((document) => document.id)
          }
        })
        .select("*")
        .single()
    );

    await updateOrderStatus(client, orderId);
    await client.from("document_audit_events").insert({
      organization_id: order.organization_id,
      order_id: orderId,
      document_id: reportPdf.id,
      event: "Uploaded",
      actor_id: userId,
      actor_name: submitterName,
      detail: "Stored report package submitted for review.",
      metadata: { submissionId: submission.id, sourceDocumentIds: activeDocuments.map((document) => document.id) }
    });

    return Response.json({
      submission: mapReportSubmission(submission),
      message: "Report package submitted from private Supabase Storage."
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "CAS could not submit that report package.", 400);
  }
}
