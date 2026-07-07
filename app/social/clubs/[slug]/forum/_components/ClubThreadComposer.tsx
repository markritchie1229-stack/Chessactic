"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Props = {
  clubId: string;
  canPost: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

async function uploadThreadImage(clubId: string, file: File) {
  const extension = file.name.split(".").pop() || "bin";
  const path = `${clubId}/threads/thread-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("club-media").upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("club-media").getPublicUrl(path);
  return data.publicUrl;
}

export function ClubThreadComposer({ clubId, canPost, action }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const disabled = !canPost || isUploading;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || disabled) return;

    setError("");
    setIsUploading(true);

    try {
      const uploadedUrl = await uploadThreadImage(clubId, file);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setImageUrl(uploadedUrl);
      setImageName(file.name);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  }

  function openFilePicker() {
    if (disabled) return;
    fileInputRef.current?.click();
  }

  function clearImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageUrl("");
    setImageName("");
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetComposer() {
    setTitle("");
    setBody("");
    clearImage();
    setError("");
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
        <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={disabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-cyan-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            title="Add image"
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1 text-xs text-slate-400">
            {isUploading
              ? "Uploading image..."
              : imageName
                ? `Attached: ${imageName}`
                : "Add a picture"}
          </div>

          {imageUrl ? (
            <button
              type="button"
              onClick={clearImage}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-rose-500 hover:text-rose-200"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </div>

        {previewUrl ? (
          <div className="border-b border-slate-800 bg-slate-950/80 p-3">
            <img
              src={previewUrl}
              alt="Selected thread upload"
              className="max-h-72 w-full rounded-xl object-cover"
            />
          </div>
        ) : null}

        <div className="grid gap-4 p-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-100">Thread title</span>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canPost}
              placeholder={canPost ? "Your idea here..." : "Join the club to post"}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-100">Thread body</span>
            <textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              disabled={!canPost}
              placeholder="Explain the topic..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <input type="hidden" name="imageUrl" value={imageUrl} readOnly />

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={resetComposer}
          disabled={!canPost || isUploading}
          className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </button>

        <button
          type="submit"
          disabled={!canPost || isUploading}
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            "Post Thread"
          )}
        </button>
      </div>
    </form>
  );
}