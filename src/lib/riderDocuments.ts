import { supabase } from "@/integrations/supabase/client";
export const DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export function validateDocument(file: Pick<File, "size" | "type">) {
  if (!DOCUMENT_TYPES.includes(file.type)) throw new Error("Choose a JPG, PNG, WebP photo or PDF.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Document must be 10 MB or smaller.");
}
export async function uploadRiderDocument(riderId: string, file: File) {
  validateDocument(file);
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[file.type];
  const path = `${riderId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("rider-documents").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}
export async function openRiderDocument(doc: { storage_path?: string | null; file_url: string }) {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    let url = doc.file_url;
    if (doc.storage_path) {
      const { data, error } = await supabase.storage.from("rider-documents").createSignedUrl(doc.storage_path, 300);
      if (error) throw error;
      url = data.signedUrl;
    }
    if (!/^https?:\/\//.test(url)) throw new Error("Document is unavailable.");
    if (tab) tab.location.href = url;
    else throw new Error("Allow pop-ups to view the document.");
  } catch (error) { tab?.close(); throw error; }
}