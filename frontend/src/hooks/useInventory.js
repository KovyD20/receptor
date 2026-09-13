import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useCatalog } from "../context/CatalogContext";
import {
  areUnitsCompatible,
  convertAmount,
  normalizeUnit,
  roundToBuyableAmount,
  stripAmountsAndUnits,
  unitInfo,
} from "../lib/units";
import {
  upsertInventoryItem,
  upsertPurchaseItem,
  USER_NOTE_MAX,
} from "../lib/inventory";
import { isIgnoredIngredient, strippedModifiers } from "../lib/ingredientText";

const BATCH_LIMIT = 500;

export function useInventory(uid) {
  const {
    getCatalogItemByName,
    getMissingCatalogRecommendations,
    groupItemsByCatalog,
    resolveCanonicalCatalogName,
    resolveCatalogKey,
  } = useCatalog();

  const [shoppingList, setShoppingList] = useState([]);
  const [fridge, setFridge] = useState([]);
  const [shopLoadedUid, setShopLoadedUid] = useState(null);
  const [fridgeLoadedUid, setFridgeLoadedUid] = useState(null);
  const shopLoading = Boolean(uid) && shopLoadedUid !== uid;
  const fridgeLoading = Boolean(uid) && fridgeLoadedUid !== uid;

  const normalizeName = (value) =>
    resolveCatalogKey(stripAmountsAndUnits(value));

  const canonicalizeName = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    return resolveCanonicalCatalogName(raw);
  };

  useEffect(() => {
    if (!uid) return;

    const shopRef = collection(db, "users", uid, "shoppingList");
    const fridgeRef = collection(db, "users", uid, "fridge");

    const unsubShop = onSnapshot(
      query(shopRef, orderBy("name")),
      (snap) => {
        setShoppingList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setShopLoadedUid(uid);
      },
      (err) => {
        console.error("Hiba a bevásárlólista olvasásakor", err);
        setShopLoadedUid(uid);
      },
    );

    const unsubFridge = onSnapshot(
      query(fridgeRef, orderBy("name")),
      (snap) => {
        setFridge(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setFridgeLoadedUid(uid);
      },
      (err) => {
        console.error("Hiba a hűtő olvasásakor", err);
        setFridgeLoadedUid(uid);
      },
    );

    return () => {
      unsubShop();
      unsubFridge();
    };
  }, [uid]);

  const groupedShoppingList = useMemo(
    () => groupItemsByCatalog(shoppingList),
    [shoppingList, groupItemsByCatalog],
  );

  const groupedFridge = useMemo(
    () => groupItemsByCatalog(fridge),
    [fridge, groupItemsByCatalog],
  );

  const missingRecommendations = useMemo(
    () => getMissingCatalogRecommendations(fridge, shoppingList),
    [fridge, shoppingList, getMissingCatalogRecommendations],
  );

  const addToShoppingList = async (ingredients) => {
    const groups = new Map();
    for (const ing of ingredients) {
      const rawName = (ing?.name || "").toString().trim();
      if (!rawName) continue;
      if (isIgnoredIngredient(rawName)) continue;
      const amount = Number(ing?.amount || 0);
      if (!amount || amount <= 0) continue;

      const nameKey = normalizeName(rawName);
      const purchase = getCatalogItemByName(rawName)?.purchase;
      const hasPackage = Boolean(purchase?.unit) && Number(purchase?.amount) > 0;

      const unit = normalizeUnit(ing?.unit);
      const { kind } = unitInfo(unit);
      const bucket =
        kind === "mass" || kind === "volume" ? kind : unit;
      const key = hasPackage ? nameKey : `${nameKey}|${bucket}`;

      const group = groups.get(key) || {
        name: rawName,
        purchase,
        asks: [],
        notes: [],
      };
      group.asks.push({ amount, unit });
      group.notes.push(...strippedModifiers(rawName, canonicalizeName(rawName)));
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      await upsertPurchaseItem({
        db,
        uid,
        list: shoppingList,
        canonicalName: canonicalizeName(group.name),
        asks: group.asks,
        purchase: group.purchase,
        nameKeyOf: normalizeName,
        notes: group.notes,
      });
    }
  };

  const addSingleShoppingItem = async (item) => {
    const rawName = (item?.name || "").toString().trim();
    const amount = Number(item?.amount || 0);
    if (!rawName || amount <= 0) return;

    const unit = normalizeUnit(item?.unit);

    await upsertInventoryItem({
      db,
      uid,
      collectionName: "shoppingList",
      list: shoppingList,
      canonicalName: canonicalizeName(rawName),
      unit,
      mergeAmount: roundToBuyableAmount(amount, unit),
      nameKeyOf: normalizeName,
    });
  };

  const updateShoppingItem = async (item, delta) => {
    const nextAmount = Number(item.amount || 0) + delta;
    if (nextAmount <= 0) return;
    const canonicalName = canonicalizeName(item?.name);
    await updateDoc(doc(db, "users", uid, "shoppingList", item.id), {
      amount: nextAmount,
      name: canonicalName || item?.name,
      ...(item.sourceAmount === undefined && item.sourceLoose === undefined
        ? {}
        : {
            sourceAmount: deleteField(),
            sourceUnit: deleteField(),
            sourceLoose: deleteField(),
          }),
    });
  };

  const setInventoryItemAmount =
    (collectionName) =>
    async (item, { amount, unit } = {}) => {
      if (!uid || !item?.id) return;

      let nextAmount = amount === undefined ? Number(item.amount || 0) : Number(amount);
      let nextUnit = item.unit;

      if (unit !== undefined) {
        const normalized = normalizeUnit(unit);
        if (!normalized) return;
        if (normalized !== item.unit) {
          const from = unitInfo(item.unit);
          const to = unitInfo(normalized);
          if (areUnitsCompatible(from, to)) {
            nextAmount =
              Math.round(convertAmount(nextAmount, from, to) * 100) / 100;
          }
        }
        nextUnit = normalized;
      }

      if (!Number.isFinite(nextAmount) || nextAmount <= 0) return;
      if (nextAmount === Number(item.amount || 0) && nextUnit === item.unit) return;

      await updateDoc(doc(db, "users", uid, collectionName, item.id), {
        amount: nextAmount,
        unit: nextUnit,
        ...(item.sourceAmount === undefined && item.sourceLoose === undefined
          ? {}
          : {
              sourceAmount: deleteField(),
              sourceUnit: deleteField(),
              sourceLoose: deleteField(),
            }),
      });
    };

  const setShoppingItemAmount = setInventoryItemAmount("shoppingList");
  const setFridgeItemAmount = setInventoryItemAmount("fridge");

  const setShoppingItemNote = async (item, note) => {
    if (!uid || !item?.id) return;
    const next = (note ?? "").toString().trim().slice(0, USER_NOTE_MAX);
    if (next === (item.userNote || "")) return;
    await updateDoc(doc(db, "users", uid, "shoppingList", item.id), {
      userNote: next || deleteField(),
    });
  };

  const toggleShoppingItemDone = (item) =>
    updateDoc(doc(db, "users", uid, "shoppingList", item.id), {
      done: !item.done,
    });

  const deleteShoppingItem = (item) =>
    deleteDoc(doc(db, "users", uid, "shoppingList", item.id));

  const deleteShoppingItems = async (items) => {
    for (let start = 0; start < items.length; start += BATCH_LIMIT) {
      const batch = writeBatch(db);
      for (const item of items.slice(start, start + BATCH_LIMIT)) {
        batch.delete(doc(db, "users", uid, "shoppingList", item.id));
      }
      await batch.commit();
    }
  };

  const clearDoneShoppingItems = () =>
    deleteShoppingItems(shoppingList.filter((item) => item.done));

  const clearShoppingList = () => deleteShoppingItems(shoppingList);

  const moveShoppingToFridge = async () => {
    if (shoppingList.length === 0) return;

    await Promise.all(
      shoppingList.map(async (item) => {
        const rawName = (item?.name || "").toString().trim();
        const amount = Number(item?.amount || 0);
        if (!rawName || amount <= 0) return;

        await upsertInventoryItem({
          db,
          uid,
          collectionName: "fridge",
          list: fridge,
          canonicalName: canonicalizeName(rawName),
          unit: normalizeUnit(item?.unit),
          mergeAmount: amount,
          nameKeyOf: normalizeName,
        });

        await deleteDoc(doc(db, "users", uid, "shoppingList", item.id));
      }),
    );
  };

  const addToFridge = async (item, delta) => {
    const rawName = (item?.name || "").toString().trim();
    if (!rawName) return;
    const amount = Number(item?.amount || 0);
    const change = Number(delta || 0);
    const unit = normalizeUnit(item?.unit);
    const typed = roundToBuyableAmount(amount, unit);

    await upsertInventoryItem({
      db,
      uid,
      collectionName: "fridge",
      list: fridge,
      canonicalName: canonicalizeName(rawName),
      unit,
      mergeAmount: change !== 0 ? change : typed,
      createAmount: typed,
      nameKeyOf: normalizeName,
    });
  };

  const deleteFridgeItem = (item) =>
    deleteDoc(doc(db, "users", uid, "fridge", item.id));

  return {
    shoppingList,
    fridge,
    inventoryLoading: shopLoading || fridgeLoading,
    groupedShoppingList,
    groupedFridge,
    missingRecommendations,
    addToShoppingList,
    addSingleShoppingItem,
    updateShoppingItem,
    setShoppingItemAmount,
    setShoppingItemNote,
    setFridgeItemAmount,
    toggleShoppingItemDone,
    deleteShoppingItem,
    clearDoneShoppingItems,
    clearShoppingList,
    moveShoppingToFridge,
    addToFridge,
    deleteFridgeItem,
  };
}
