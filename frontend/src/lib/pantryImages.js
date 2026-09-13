export function pantryImageSlug(nameKey) {
  if (!nameKey) return "";
  return nameKey.toString().trim().replace(/\s+/g, "-");
}

export const PANTRY_IMAGE_EXT = "png";

export function pantryImageUrl(item) {
  if (item?.imageUrl) return item.imageUrl;

  const slug = pantryImageSlug(item?.nameKey);
  return slug ? `/pantry/${slug}.${PANTRY_IMAGE_EXT}` : null;
}
