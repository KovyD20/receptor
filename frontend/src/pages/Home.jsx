import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

import LightPillar from "../components/Background/LightPillar";
import Icon from "../components/Icon/Icon";
import TopBar from "../components/AppShell/TopBar";
import BottomTabBar from "../components/AppShell/BottomTabBar";
import RecipesView from "../components/views/RecipesView";
import RecipeView from "../components/views/RecipeView";
import ShoppingView from "../components/views/ShoppingView";
import FridgeView from "../components/views/FridgeView";
import NewRecipeView from "../components/views/NewRecipeView";
import CookMode from "../components/views/CookMode";
import NewRecipeForm from "../components/NewRecipeForm/NewRecipeForm";
import LoadingBanner from "../components/LoadingBanner/LoadingBanner";
import ShortcutsHelp from "../components/ShortcutsHelp/ShortcutsHelp";

import "./home/shell.css";
import "./home/layout.css";
import "./home/recipe.css";
import "./home/lists.css";
import "./home/forms.css";
import "./home/cook-mode.css";
import "./home/responsive.css";
import { SYSTEM_UNITS } from "../constants/units";
import { useRecipes } from "../hooks/useRecipes";
import { useInventory } from "../hooks/useInventory";
import { useIsMobile } from "../hooks/useIsMobile";
import { useGlobalKeys } from "../hooks/useGlobalKeys";
import { useSpatialNav } from "../hooks/useSpatialNav";
import { isTypingTarget } from "../lib/keyboard";
import { useCategoryColors } from "../hooks/useCategoryColors";
import { TAB_IDS } from "../constants/tabs";
import { useCatalog } from "../context/CatalogContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import {
  filterRecipes,
  itemMatchesSearch,
  recipeServings,
  scaleIngredients,
  sortByAvailability,
  sortByCourse,
} from "../lib/recipes";

function filterGroups(groups, search) {
  if (!search) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => itemMatchesSearch(item, search)),
    }))
    .filter((group) => group.items.length > 0);
}

export default function Home({ user }) {
  const {
    recipes,
    allTags,
    recipesLoading,
    addTag,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleFavorite,
    deleteTagGlobally,
  } = useRecipes(user.uid);

  const {
    shoppingList,
    fridge,
    inventoryLoading,
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
  } = useInventory(user.uid);

  const {
    resolveCatalogKey,
    searchCatalog,
    browseCatalog,
    ready: catalogReady,
    loading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useCatalog();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const isMobile = useIsMobile();
  const {
    colorFor: categoryColorFor,
    isCustom: isCustomCategoryColor,
    setColor: setCategoryColor,
    resetColor: resetCategoryColor,
  } = useCategoryColors(user.uid);

  const [tab, setTab] = useState("receptek");
  const [selectedId, setSelectedId] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [importedRecipe, setImportedRecipe] = useState(null);
  const [filterTag, setFilterTag] = useState("all");
  const [sortMode, setSortMode] = useState("course");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [servingsFor, setServingsFor] = useState({});
  const [cooking, setCooking] = useState(false);
  const [cookStep, setCookStep] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchInputRef = useRef(null);
  const loadedToastShown = useRef(false);

  const dataLoading = catalogLoading || recipesLoading || inventoryLoading;

  useEffect(() => {
    if (loadedToastShown.current) return;
    if (!catalogReady || dataLoading) return;
    loadedToastShown.current = true;
    showToast("Adatok betöltve", "success");
  }, [catalogReady, dataLoading, showToast]);

  const notifyError = (err, msg = "Hiba történt") => {
    console.error(err);
    showToast(msg, "error");
  };

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedId) || null,
    [recipes, selectedId],
  );

  const baseServings = recipeServings(selectedRecipe);
  const servings = servingsFor[selectedId] ?? baseServings;
  const setServings = (next) =>
    setServingsFor((prev) => ({ ...prev, [selectedId]: next }));

  const scaledIngredients = useMemo(
    () => scaleIngredients(selectedRecipe?.ingredients, servings, baseServings),
    [selectedRecipe, servings, baseServings],
  );

  const steps = selectedRecipe?.steps || [];

  const visibleRecipes = useMemo(() => {
    const filtered = filterRecipes(recipes, { filterTag, search });
    if (sortMode === "course") return sortByCourse(filtered);
    if (sortMode !== "availability") return filtered;
    return sortByAvailability(filtered, fridge, resolveCatalogKey);
  }, [recipes, filterTag, search, sortMode, fridge, resolveCatalogKey]);

  const visibleShoppingGroups = useMemo(
    () => filterGroups(groupedShoppingList, search),
    [groupedShoppingList, search],
  );

  const visibleFridgeGroups = useMemo(
    () => filterGroups(groupedFridge, search),
    [groupedFridge, search],
  );

  const doneCount = shoppingList.filter((item) => item.done).length;
  const openCount = shoppingList.length - doneCount;

  const goToTab = (next) => {
    setTab(next);
    setSearchOpen(false);
  };

  const openRecipe = (recipe) => {
    setSelectedId(recipe.id);
    setEditingRecipe(null);
    setCookStep(0);
    goToTab("recept");
  };

  const badgeFor = (id) => (id === "lista" && openCount > 0 ? openCount : null);

  const handleAddIngredients = async (ingredients, message) => {
    try {
      await addToShoppingList(ingredients);
      showToast(message, "success");
    } catch (err) {
      notifyError(err);
    }
  };

  const handleCategoryColorChange = async (category, hex) => {
    try {
      await setCategoryColor(category, hex);
    } catch (err) {
      notifyError(err, "A szín mentése sikertelen");
    }
  };

  const handleCategoryColorReset = async (category) => {
    try {
      await resetCategoryColor(category);
    } catch (err) {
      notifyError(err, "A szín visszaállítása sikertelen");
    }
  };

  const handleToggleFavorite = async (recipe) => {
    if (!recipe) return;
    try {
      await toggleFavorite(recipe);
    } catch (err) {
      notifyError(err, "Kedvenc jelölés sikertelen");
    }
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return;
    if (
      !(await confirm(`Biztosan törlöd a "${selectedRecipe.name}" receptet?`, {
        danger: true,
        confirmLabel: "Törlés",
      }))
    )
      return;
    try {
      await deleteRecipe(selectedRecipe.id);
      setSelectedId(null);
      goToTab("receptek");
    } catch (err) {
      notifyError(err, "Recept törlése sikertelen");
    }
  };

  const handleMoveToFridge = async () => {
    if (shoppingList.length === 0) return;
    if (!(await confirm("Biztos, hogy megvetted a lista termékeit?"))) return;
    try {
      await moveShoppingToFridge();
      showToast("A lista átkerült a hűtőbe", "success");
    } catch (err) {
      notifyError(err);
    }
  };

  const handleClearDone = async () => {
    if (doneCount === 0) return;
    if (
      !(await confirm("Biztosan törlöd a kész tételeket?", {
        danger: true,
        confirmLabel: "Törlés",
      }))
    )
      return;
    try {
      await clearDoneShoppingItems();
    } catch (err) {
      notifyError(err);
    }
  };

  const handleClearAll = async () => {
    if (shoppingList.length === 0) return;
    if (
      !(await confirm(
        `Biztosan törlöd mind a ${shoppingList.length} tételt a listáról?`,
        { danger: true, confirmLabel: "Lista ürítése" },
      ))
    )
      return;
    try {
      await clearShoppingList();
      showToast("A bevásárlólista kiürítve", "success");
    } catch (err) {
      notifyError(err, "A lista ürítése sikertelen");
    }
  };

  const signOutUser = () =>
    signOut(auth).catch((err) => notifyError(err, "Kijelentkezés sikertelen"));

  const focusSearch = () => {
    if (!isMobile || tab === "receptek") {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
      return;
    }
    setSearchOpen(true);
  };

  const closeManualForm = () => {
    setShowManualForm(false);
    setImportedRecipe(null);
  };

  const focusHome = () => {
    const home = document.querySelector("[data-nav-home]");
    if (!home) return false;
    home.focus();
    return true;
  };

  const { exitField } = useSpatialNav({ onFallback: focusHome });

  const handleEscape = () => {
    if (helpOpen) {
      setHelpOpen(false);
      return true;
    }
    if (cooking) {
      setCooking(false);
      return true;
    }
    if (editingRecipe || showManualForm) {
      if (isTypingTarget(document.activeElement)) return exitField();
      setEditingRecipe(null);
      closeManualForm();
      focusHome();
      return true;
    }
    if (searchOpen) {
      setSearchOpen(false);
      focusHome();
      return true;
    }
    if (exitField()) return true;
    if (document.activeElement?.hasAttribute?.("data-nav-home")) return false;
    return focusHome();
  };

  useGlobalKeys({
    tabIds: TAB_IDS,
    onSelectTab: goToTab,
    onFocusSearch: focusSearch,
    onToggleHelp: () => setHelpOpen((prev) => !prev),
    onEscape: handleEscape,
  });

  const renderTab = () => {
    if (tab === "receptek") {
      return (
        <RecipesView
          recipes={visibleRecipes}
          totalCount={recipes.length}
          selectedId={selectedId}
          filterTag={filterTag}
          allTags={allTags}
          search={search}
          isMobile={isMobile}
          searchInputRef={searchInputRef}
          sortMode={sortMode}
          fridge={fridge}
          resolveCatalogKey={resolveCatalogKey}
          onSortChange={setSortMode}
          onFilterChange={setFilterTag}
          onSearchChange={setSearch}
          onSelectRecipe={openRecipe}
          onToggleFavorite={handleToggleFavorite}
        />
      );
    }

    if (tab === "recept") {
      if (editingRecipe) {
        return (
          <div className="form-view">
            <div className="form-shell" style={{ "--accent": "var(--orange)" }}>
              <header className="form-shell-head">
                <span className="panel-title">Recept szerkesztése</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Szerkesztés bezárása"
                  onClick={() => setEditingRecipe(null)}
                >
                  <Icon name="xmark" size={14} />
                </button>
              </header>
              <NewRecipeForm
                editMode
                recipe={editingRecipe}
                existingTags={allTags}
                onAddTag={addTag}
                onDeleteTag={deleteTagGlobally}
                onSave={async ({ id, ...data }, imageOpts) => {
                  try {
                    await updateRecipe(id, data, imageOpts);
                    setEditingRecipe(null);
                    showToast("Recept frissítve", "success");
                  } catch (err) {
                    notifyError(
                      err,
                      err?.stage === "image"
                        ? "A recept mentve, de a kép feltöltése nem sikerült"
                        : "Recept mentése sikertelen",
                    );
                  }
                }}
              />
            </div>
          </div>
        );
      }

      return (
        <RecipeView
          recipe={selectedRecipe}
          ingredients={scaledIngredients}
          steps={steps}
          fridge={fridge}
          resolveCatalogKey={resolveCatalogKey}
          servings={servings}
          isMobile={isMobile}
          onServingsChange={setServings}
          onStartCook={() => {
            setCookStep(0);
            setCooking(true);
          }}
          onAddIngredient={(ingredient) =>
            handleAddIngredients(
              [ingredient],
              `${ingredient.name} a bevásárlólistán`,
            )
          }
          onAddAllToCart={() =>
            handleAddIngredients(
              scaledIngredients,
              "A teljes recept a bevásárlólistán",
            )
          }
          onAddMissingToCart={(missing) =>
            handleAddIngredients(missing, "A hiányzó tételek a bevásárlólistán")
          }
          onToggleFavorite={() => handleToggleFavorite(selectedRecipe)}
          onEdit={() => setEditingRecipe(selectedRecipe)}
          onDelete={handleDeleteRecipe}
          onGoToRecipes={() => goToTab("receptek")}
        />
      );
    }

    if (tab === "lista") {
      return (
        <ShoppingView
          groups={visibleShoppingGroups}
          openCount={openCount}
          doneCount={doneCount}
          units={SYSTEM_UNITS}
          suggest={searchCatalog}
          browse={browseCatalog}
          recommendations={missingRecommendations}
          isMobile={isMobile}
          colorFor={categoryColorFor}
          isCustomColor={isCustomCategoryColor}
          onCategoryColorChange={handleCategoryColorChange}
          onCategoryColorReset={handleCategoryColorReset}
          onToggleDone={(item) =>
            toggleShoppingItemDone(item).catch(notifyError)
          }
          onUpdateItem={(item, delta) =>
            updateShoppingItem(item, delta).catch(notifyError)
          }
          onSetItemAmount={(item, patch) =>
            setShoppingItemAmount(item, patch).catch(notifyError)
          }
          onSetItemNote={(item, note) =>
            setShoppingItemNote(item, note).catch(notifyError)
          }
          onDeleteItem={async (item) => {
            if (
              !(await confirm("Biztosan törlöd?", {
                danger: true,
                confirmLabel: "Törlés",
              }))
            )
              return;
            await deleteShoppingItem(item).catch(notifyError);
          }}
          onAddItem={(item) => addSingleShoppingItem(item).catch(notifyError)}
          onClearDone={handleClearDone}
          onClearAll={handleClearAll}
          onMoveToFridge={handleMoveToFridge}
        />
      );
    }

    if (tab === "huto") {
      return (
        <FridgeView
          groups={visibleFridgeGroups}
          itemCount={fridge.length}
          units={SYSTEM_UNITS}
          suggest={searchCatalog}
          browse={browseCatalog}
          isMobile={isMobile}
          colorFor={categoryColorFor}
          isCustomColor={isCustomCategoryColor}
          onCategoryColorChange={handleCategoryColorChange}
          onCategoryColorReset={handleCategoryColorReset}
          onUpdateItem={(item, delta) =>
            addToFridge(item, delta).catch((err) =>
              notifyError(err, "Hiba a hűtő frissítésekor"),
            )
          }
          onSetItemAmount={(item, patch) =>
            setFridgeItemAmount(item, patch).catch((err) =>
              notifyError(err, "Hiba a hűtő frissítésekor"),
            )
          }
          onDeleteItem={async (item) => {
            if (
              !(await confirm("Biztosan törlöd?", {
                danger: true,
                confirmLabel: "Törlés",
              }))
            )
              return;
            await deleteFridgeItem(item).catch(notifyError);
          }}
          onAddItem={(item) =>
            addToFridge(item).catch((err) =>
              notifyError(err, "Hiba a hűtő frissítésekor"),
            )
          }
          onGoToNew={() => goToTab("uj")}
        />
      );
    }

    if (showManualForm) {
      return (
        <div className="form-view">
          <div className="form-shell" style={{ "--accent": "var(--brand)" }}>
            <header className="form-shell-head">
              <span className="panel-title">
                {importedRecipe ? "Beolvasott recept" : "Új saját recept"}
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Űrlap bezárása"
                onClick={closeManualForm}
              >
                <Icon name="xmark" size={14} />
              </button>
            </header>
            {importedRecipe && (
              <div className="form-shell-note">
                Beolvasva innen: <span>{importedRecipe.sourceUrl}</span> — nézd át,
                mielőtt mented.
              </div>
            )}
            <NewRecipeForm
              key={importedRecipe ? `imported-${importedRecipe.sourceUrl}` : "blank"}
              recipe={importedRecipe?.recipe}
              existingTags={allTags}
              onAddTag={addTag}
              onDeleteTag={deleteTagGlobally}
              onCreate={async (data, imageOpts) => {
                try {
                  await createRecipe(
                    importedRecipe
                      ? { ...data, sourceUrl: importedRecipe.sourceUrl }
                      : data,
                    imageOpts,
                  );
                  closeManualForm();
                  showToast("Recept elmentve", "success");
                  goToTab("receptek");
                } catch (err) {
                  if (err?.stage === "image") {
                    closeManualForm();
                    goToTab("receptek");
                  }
                  notifyError(
                    err,
                    err?.stage === "image"
                      ? "A recept elmentve, de a kép feltöltése nem sikerült"
                      : "Recept mentése sikertelen",
                  );
                }
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <NewRecipeView
        fridge={fridge}
        isMobile={isMobile}
        onStartManual={() => setShowManualForm(true)}
        onSaveAiRecipe={createRecipe}
        onImported={(recipe, sourceUrl) => {
          setImportedRecipe({ recipe, sourceUrl });
          setShowManualForm(true);
        }}
      />
    );
  };

  return (
    <div className="app">
      <div className="app-bg">
        <LightPillar />
      </div>

      <TopBar
        user={user}
        isMobile={isMobile}
        tab={tab}
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen((prev) => !prev)}
        searchInputRef={searchInputRef}
        onOpenHelp={() => setHelpOpen(true)}
        onSignOut={signOutUser}
        onSignOutWithConfirm={async () => {
          if (!(await confirm("Kijelentkezel?"))) return;
          signOutUser();
        }}
        badgeFor={badgeFor}
        onSelectTab={goToTab}
      />

      <LoadingBanner
        loading={dataLoading}
        error={catalogError}
        onRetry={reloadCatalog}
      />

      <main className="app-main">{renderTab()}</main>

      {isMobile && (
        <BottomTabBar tab={tab} badgeFor={badgeFor} onSelectTab={goToTab} />
      )}

      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}

      {cooking && selectedRecipe && steps.length > 0 && (
        <CookMode
          recipeName={selectedRecipe.name}
          steps={steps}
          ingredients={scaledIngredients}
          step={cookStep}
          isMobile={isMobile}
          onStep={(next) =>
            setCookStep(Math.max(0, Math.min(steps.length - 1, next)))
          }
          onClose={() => setCooking(false)}
        />
      )}
    </div>
  );
}
