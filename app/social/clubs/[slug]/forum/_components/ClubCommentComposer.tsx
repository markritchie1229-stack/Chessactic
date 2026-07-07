"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Props = {
  clubId: string;
  threadId: string;
  canPost: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

async function uploadCommentImage(clubId: string, threadId: string, file: File) {
  const extension = file.name.split(".").pop() || "bin";
  const path = `${clubId}/threads/${threadId}/comment-${crypto.randomUUID()}.${extension}`;

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

export function ClubCommentComposer({
  clubId,
  threadId,
  canPost,
  action,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      const uploadedUrl = await uploadCommentImage(clubId, threadId, file);

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

  return (
    <form action={action} className="mt-5 space-y-3">
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
              alt="Selected comment upload"
              className="max-h-72 w-full rounded-xl object-cover"
            />
          </div>
        ) : null}

        <textarea
          name="body"
          rows={4}
          disabled={!canPost}
          placeholder={
            canPost
              ? "Write your reply, or just add a picture..."
              : "You must be a club member to reply."
          }
          className="w-full resize-y rounded-none border-0 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <input type="hidden" name="imageUrl" value={imageUrl} readOnly />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
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
            "Post Reply"
          )}
        </button>
      </div>
    </form>
  );
}