import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import { unitInfo, areUnitsCompatible, convertAmount } from "./units";

export async function upsertInventoryItem({
  db,
  uid,
  collectionName,
  list,
  canonicalName,
  unit,
  mergeAmount,
  createAmount = mergeAmount,
  nameKeyOf,
  purchaseSource,
}) {
  const nameKey = nameKeyOf(canonicalName);
  const incomingUnitInfo = unitInfo(unit);

  const existing = list.find((i) => {
    if (nameKeyOf(i.name) !== nameKey) return false;
    return areUnitsCompatible(unitInfo(i.unit), incomingUnitInfo);
  });

  if (existing) {
    const converted = convertAmount(
      mergeAmount,
      incomingUnitInfo,
      unitInfo(existing.unit),
    );
    const nextAmount = Number(existing.amount || 0) + converted;
    if (nextAmount <= 0) return { status: "skipped" };
    await updateDoc(doc(db, "users", uid, collectionName, existing.id), {
      amount: nextAmount,
      name: canonicalName,
      ...(purchaseSource === undefined
        ? {}
        : { sourceAmount: deleteField(), sourceUnit: deleteField() }),
    });
    return { status: "merged", id: existing.id };
  }

  if (createAmount <= 0) return { status: "skipped" };
  const ref = await addDoc(collection(db, "users", uid, collectionName), {
    name: canonicalName,
    amount: createAmount,
    unit,
    ...(purchaseSource
      ? { sourceAmount: purchaseSource.amount, sourceUnit: purchaseSource.unit }
      : {}),
  });
  return { status: "created", id: ref.id };
}
