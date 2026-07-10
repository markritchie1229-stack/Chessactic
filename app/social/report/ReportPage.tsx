"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Flag, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { submitModerationReport } from "./../clubs/_lib/moderation.server"

export default function ReportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const fileCount = useMemo(() => files.length, [files]);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(event.target.files ?? []));
  };

  const uploadFiles = async () => {
    const urls: string[] = [];

    for (const file of files) {
      const safeName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `reports/${safeName}`;

      const { error } = await supabase.storage.from("club-media")
        .upload(path, file, { upsert: false });

      if (error) {
        throw new Error(error.message);
      }

      const { data } = supabase.storage.from("club-media").getPublicUrl(path);
      if (data?.publicUrl) {
        urls.push(data.publicUrl);
      }
    }

    return urls;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const imageUrls = await uploadFiles();
      await submitModerationReport({
        title: title.trim() || null,
        description,
        imageUrls,
      });

      setTitle("");
      setDescription("");
      setFiles([]);
      setMessage("Report submitted to admin review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/30"
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950">
            <Flag className="h-5 w-5 text-slate-100" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">Report behavior</h1>
            <p className="text-sm text-slate-400">
              Describe what happened and attach screenshots if needed.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-slate-500"
              placeholder="Harassment, spam, impersonation..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-slate-500"
              placeholder="Explain exactly what is happening, who is involved, and when it started."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Upload images</label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-4 py-4 text-slate-300 hover:border-slate-500">
              <ImagePlus className="h-5 w-5" />
              <span>{fileCount > 0 ? `${fileCount} file(s) selected` : "Choose screenshots or photos"}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit report
          </button>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </div>
      </form>
    </main>
  );
}
