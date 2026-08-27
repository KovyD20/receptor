export function pantryImageSlug(nameKey) {
  if (!nameKey) return "";
  return nameKey.toString().trim().replace(/\s+/g, "-");
}

export function pantryImageUrl(item) {
  if (item?.imageUrl) return item.imageUrl;

  const slug = pantryImageSlug(item?.nameKey);
  return slug ? `/pantry/${slug}.webp` : null;
}
