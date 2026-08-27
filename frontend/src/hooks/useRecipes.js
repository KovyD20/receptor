import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase";
import { deleteRecipeImage, uploadRecipeImage } from "../lib/imageUpload";

export function useRecipes(uid) {
  const [recipes, setRecipes] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loadedUid, setLoadedUid] = useState(null);
  const loading = Boolean(uid) && loadedUid !== uid;

  useEffect(() => {
    if (!uid) return;

    const recipesRef = collection(db, "users", uid, "recipes");
    const unsub = onSnapshot(
      query(recipesRef, orderBy("name")),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRecipes(items);
        const tags = new Set();
        items.forEach((item) => item.tags?.forEach((tag) => tags.add(tag)));
        setAllTags([...tags]);
        setLoadedUid(uid);
      },
      (err) => {
        console.error("Hiba a receptek olvasásakor", err);
        setLoadedUid(uid);
      },
    );

    return () => unsub();
  }, [uid]);

  const addTag = (tag) =>
    setAllTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));

  const imageUrlOf = (id) => recipes.find((r) => r.id === id)?.imageUrl || null;

  const asImageStageError = (err) => {
    if (err && typeof err === "object") err.stage = "image";
    return err;
  };

  const createRecipe = async (data, { imageFile } = {}) => {
    const created = await addDoc(collection(db, "users", uid, "recipes"), data);
    if (!imageFile) return created;

    try {
      const imageUrl = await uploadRecipeImage({
        uid,
        recipeId: created.id,
        file: imageFile,
      });
      await updateDoc(doc(db, "users", uid, "recipes", created.id), { imageUrl });
    } catch (err) {
      throw asImageStageError(err);
    }
    return created;
  };

  const updateRecipe = async (id, data, { imageFile, removeImage } = {}) => {
    const previousUrl = imageUrlOf(id);
    let patch = data;

    if (imageFile) {
      try {
        patch = {
          ...data,
          imageUrl: await uploadRecipeImage({ uid, recipeId: id, file: imageFile }),
        };
      } catch (err) {
        throw asImageStageError(err);
      }
    } else if (removeImage) {
      patch = { ...data, imageUrl: deleteField() };
    }

    await updateDoc(doc(db, "users", uid, "recipes", id), patch);

    if (imageFile || removeImage) await deleteRecipeImage(previousUrl);
  };

  const deleteRecipe = async (id) => {
    const url = imageUrlOf(id);
    await deleteDoc(doc(db, "users", uid, "recipes", id));
    await deleteRecipeImage(url);
  };

  const toggleFavorite = (recipe) =>
    updateDoc(doc(db, "users", uid, "recipes", recipe.id), {
      favorite: !recipe.favorite,
    });

  const deleteTagGlobally = async (tag) => {
    const affected = recipes.filter((r) => r.tags?.includes(tag));
    if (affected.length === 0) return;

    const batch = writeBatch(db);
    affected.forEach((r) => {
      const nextTags = (r.tags || []).filter((t) => t !== tag);
      batch.update(doc(db, "users", uid, "recipes", r.id), { tags: nextTags });
    });
    await batch.commit();
  };

  return {
    recipes,
    allTags,
    recipesLoading: loading,
    addTag,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleFavorite,
    deleteTagGlobally,
  };
}
