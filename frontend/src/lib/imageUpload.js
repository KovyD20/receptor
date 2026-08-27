import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const MAX_EDGE = 1200;

const QUALITY_STEPS = [0.82, 0.7, 0.55];

export const IMAGE_ERROR = {
  MISSING: "missing",
  TYPE: "type",
  SIZE: "size",
  DECODE: "decode",
  TOO_BIG_ENCODED: "too_big_encoded",
};

export class ImageUploadError extends Error {
  constructor(code) {
    super(`image upload rejected: ${code}`);
    this.name = "ImageUploadError";
    this.code = code;
  }
}

export function validateImageFile(file) {
  if (!file) return IMAGE_ERROR.MISSING;
  if (!file.type || !file.type.startsWith("image/")) return IMAGE_ERROR.TYPE;
  if (file.size > MAX_SOURCE_BYTES) return IMAGE_ERROR.SIZE;
  return null;
}

export function fitWithin(width, height, maxEdge = MAX_EDGE) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 0, height: 0 };
  }

  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { width: Math.round(w), height: Math.round(h) };

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

export function recipeImagePath(uid, recipeId, timestamp) {
  return `recipes/${uid}/${recipeId}/${timestamp}.webp`;
}

async function decode(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ImageUploadError(IMAGE_ERROR.DECODE);
  }
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

export async function shrinkToWebp(file, maxEdge = MAX_EDGE) {
  const bitmap = await decode(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);

  if (width === 0 || height === 0) {
    bitmap.close?.();
    throw new ImageUploadError(IMAGE_ERROR.DECODE);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, quality);
    if (!blob) throw new ImageUploadError(IMAGE_ERROR.DECODE);
    if (blob.size <= MAX_UPLOAD_BYTES) return blob;
  }

  throw new ImageUploadError(IMAGE_ERROR.TOO_BIG_ENCODED);
}

export async function uploadRecipeImage({ uid, recipeId, file, now = Date.now }) {
  const invalid = validateImageFile(file);
  if (invalid) throw new ImageUploadError(invalid);

  const blob = await shrinkToWebp(file);
  const path = recipeImagePath(uid, recipeId, now());

  await uploadBytes(ref(storage, path), blob, { contentType: "image/webp" });
  return getDownloadURL(ref(storage, path));
}

export async function deleteRecipeImage(url) {
  if (!url) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    if (err?.code === "storage/object-not-found") return;
    console.warn("A recept képét nem sikerült törölni a tárolóból", err);
  }
}
