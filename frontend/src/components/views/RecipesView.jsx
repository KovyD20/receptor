import Icon from "../Icon/Icon";
import { isPlainKey } from "../../lib/keyboard";
import { useListKeyboardNav } from "../../hooks/useListKeyboardNav";
import {
  isMainTag,
  mainTagColor,
  mainTagOf,
  sortTags,
} from "../../constants/recipeTags";
import {
  availabilityLevel,
  FAVORITES_FILTER,
  recipeAvailability,
  recipeMeta,
  recipeTimeLabel,
} from "../../lib/recipes";

const SORT_MODES = [
  { id: "course", label: "Kategória szerint" },
  { id: "name", label: "Név szerint" },
  { id: "availability", label: "Ami megvan" },
];

function SortToggle({ sortMode, onSortChange }) {
  return (
    <div className="chip-row sort-row" role="group" aria-label="Rendezés">
      {SORT_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`chip${sortMode === mode.id ? " is-active" : ""}`}
          aria-pressed={sortMode === mode.id}
          onClick={() => onSortChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function CardMeta({ recipe, availability }) {
  if (!availability || availability.total === 0) {
    return <span className="recipe-card-meta">{recipeMeta(recipe)}</span>;
  }

  const time = recipeTimeLabel(recipe);
  return (
    <span className="recipe-card-meta">
      <span className={`recipe-card-avail is-${availabilityLevel(availability)}`}>
        {availability.have}/{availability.total} hozzávaló
      </span>
      {time && ` · ${time}`}
    </span>
  );
}

function CourseBadge({ recipe, ownLimit = 3 }) {
  const course = mainTagOf(recipe);
  const own = (recipe?.tags || [])
    .filter((tag) => !isMainTag(tag))
    .slice(0, ownLimit);

  if (!course && own.length === 0) return null;

  return (
    <span className="recipe-card-tags">
      {course && (
        <span className="tag-pill" style={{ "--tag-accent": mainTagColor(course) }}>
          {course}
        </span>
      )}
      {own.map((tag) => (
        <span key={tag} className="tag-pill is-own">
          {tag}
        </span>
      ))}
    </span>
  );
}

export default function RecipesView({
  recipes,
  totalCount,
  selectedId,
  filterTag,
  allTags,
  search,
  isMobile,
  sortMode,
  fridge,
  resolveCatalogKey,
  onSortChange,
  onFilterChange,
  onSearchChange,
  onSelectRecipe,
  onToggleFavorite,
  searchInputRef,
}) {
  const {
    containerRef: navContainerRef,
    onKeyDown: onNavKeyDown,
    itemProps: navItemProps,
  } = useListKeyboardNav({ layout: "grid" });
  const chips = ["all", FAVORITES_FILTER, ...sortTags(allTags)];

  const chipLabel = (tag) => {
    if (tag === "all") return "Mind";
    if (tag === FAVORITES_FILTER) {
      return (
        <>
          <Icon name="star" size={11} />
          Kedvencek
        </>
      );
    }
    return tag;
  };

  const availabilityFor = (recipe) =>
    resolveCatalogKey ? recipeAvailability(recipe, fridge, resolveCatalogKey) : null;

  const tagChips = (
    <div className="chip-row">
      {chips.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`chip${filterTag === tag ? " is-active" : ""}${
            tag === FAVORITES_FILTER ? " chip-fav" : ""
          }${isMainTag(tag) ? " chip-course" : ""}`}
          style={
            tag === "all" || tag === FAVORITES_FILTER
              ? undefined
              : { "--tag-accent": mainTagColor(tag) }
          }
          onClick={() => onFilterChange(tag)}
        >
          {chipLabel(tag)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="view">
      {isMobile ? (
        <>
          <div className="search-box">
            <Icon name="search" size={13} color="#7a7a7a" />
            <input
              ref={searchInputRef}
              placeholder="Keresés a receptek közt"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          {tagChips}
          <SortToggle sortMode={sortMode} onSortChange={onSortChange} />
        </>
      ) : (
        <div className="view-head">
          <span className="view-title">Receptek</span>
          <span className="view-count">{totalCount} db</span>
          <div className="view-spacer" />
          <SortToggle sortMode={sortMode} onSortChange={onSortChange} />
          {tagChips}
        </div>
      )}

      <div
        className="view-scroll"
        ref={navContainerRef}
        tabIndex={-1}
        onKeyDown={onNavKeyDown}
      >
        {recipes.length === 0 ? (
          <div className="empty-state">
            {totalCount === 0
              ? "Még nincs receptem. Vedd fel az elsőt az „Új recept” fülön."
              : "Nincs a szűrésnek megfelelő recept."}
          </div>
        ) : (
          <div className="grid grid-4">
            {recipes.map((recipe, index) => (
              <button
                key={recipe.id}
                type="button"
                className={`recipe-card${
                  recipe.id === selectedId ? " is-selected" : ""
                }`}
                onClick={() => onSelectRecipe(recipe)}
                {...navItemProps(recipe.id, { first: index === 0 })}
                onKeyDown={(event) => {
                  if (!isPlainKey(event)) return;
                  if (event.key.toLowerCase() !== "f" || !onToggleFavorite) return;
                  event.preventDefault();
                  onToggleFavorite(recipe);
                }}
              >
                <span className="recipe-card-art">
                  {recipe.imageUrl ? (
                    <img
                      className="recipe-card-img"
                      src={recipe.imageUrl}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                    />
                  ) : (
                    <Icon name="bowl" size={isMobile ? 17 : 32} />
                  )}
                </span>
                {recipe.favorite && (
                  <span className="recipe-card-fav" title="Kedvenc">
                    <Icon name="star" size={isMobile ? 11 : 13} />
                  </span>
                )}
                <span className="recipe-card-body">
                  <span className="recipe-card-name">{recipe.name}</span>
                  <CardMeta
                    recipe={recipe}
                    availability={availabilityFor(recipe)}
                  />
                  {!isMobile && <CourseBadge recipe={recipe} />}
                </span>
                {isMobile && (
                  <>
                    <CourseBadge recipe={recipe} ownLimit={1} />
                    <Icon name="chevronRight" size={12} color="#6a6a6a" />
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
