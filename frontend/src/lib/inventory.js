import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import {
  accumulatePurchase,
  unitInfo,
  areUnitsCompatible,
  convertAmount,
} from "./units";

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

export async function upsertPurchaseItem({
  db,
  uid,
  list,
  canonicalName,
  asks,
  purchase,
  nameKeyOf,
}) {
  const nameKey = nameKeyOf(canonicalName);
  const hasPackage = Boolean(purchase?.unit) && Number(purchase?.amount) > 0;

  const incomingUnitInfo = unitInfo(asks?.[0]?.unit);
  const existing = list.find((i) => {
    if (nameKeyOf(i.name) !== nameKey) return false;
    if (hasPackage) return true;
    return areUnitsCompatible(unitInfo(i.unit), incomingUnitInfo);
  });

  const tracked =
    existing &&
    (existing.sourceAmount !== undefined || existing.sourceLoose === true) &&
    hasPackage;
  const previous = tracked
    ? {
        amount: Number(existing.sourceAmount || 0),
        unit: existing.sourceUnit || "",
        loose: existing.sourceLoose === true,
      }
    : null;

  const buy = accumulatePurchase(asks, purchase, previous);
  if (!Number.isFinite(buy.amount) || buy.amount <= 0) return { status: "skipped" };

  const sourceFields = buy.source
    ? {
        sourceAmount: buy.source.amount,
        sourceUnit: buy.source.unit,
        ...(buy.source.loose
          ? { sourceLoose: true }
          : { sourceLoose: deleteField() }),
      }
    : {
        sourceAmount: deleteField(),
        sourceUnit: deleteField(),
        sourceLoose: deleteField(),
      };

  if (existing) {
    const nextAmount = tracked
      ? buy.amount
      : Number(existing.amount || 0) +
        convertAmount(buy.amount, unitInfo(buy.unit), unitInfo(existing.unit));
    if (nextAmount <= 0) return { status: "skipped" };

    await updateDoc(doc(db, "users", uid, "shoppingList", existing.id), {
      amount: nextAmount,
      name: canonicalName,
      ...(tracked ? { unit: buy.unit, ...sourceFields } : {}),
    });
    return { status: "merged", id: existing.id };
  }

  const ref = await addDoc(collection(db, "users", uid, "shoppingList"), {
    name: canonicalName,
    amount: buy.amount,
    unit: buy.unit,
    ...(buy.source
      ? {
          sourceAmount: buy.source.amount,
          sourceUnit: buy.source.unit,
          ...(buy.source.loose ? { sourceLoose: true } : {}),
        }
      : {}),
  });
  return { status: "created", id: ref.id };
}
