const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/recipes.json");




function readRecipes() {
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

function writeRecipes(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

router.get("/", (req, res) => {
  const recipes = readRecipes();
  res.json(recipes);
});

router.get("/:id", (req, res) => {
  const recipes = readRecipes();
  const recipe = recipes.find(r => r.id === parseInt(req.params.id));
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  res.json(recipe);
});

router.post("/", (req, res) => {
  const recipes = readRecipes();
  const newRecipe = req.body;

  newRecipe.id = recipes.length ? recipes[recipes.length - 1].id + 1 : 1;

  recipes.push(newRecipe);
  writeRecipes(recipes);
  res.status(201).json(newRecipe);
});

router.put("/:id", (req, res) => {
  const recipes = readRecipes();
  const index = recipes.findIndex(r => r.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Recipe not found" });

  recipes[index] = { ...recipes[index], ...req.body };
  writeRecipes(recipes);
  res.json(recipes[index]);
});


router.delete("/tags/:tag", (req, res) => {
  const tagToDelete = req.params.tag;
  let recipes = readRecipes();
  let changed = false;

  recipes = recipes.map(recipe => {
    if (recipe.tags?.includes(tagToDelete)) {
      changed = true;
      return {
        ...recipe,
        tags: recipe.tags.filter(t => t !== tagToDelete)
      };
    }
    return recipe;
  });

  if (changed) writeRecipes(recipes);
  res.json({ success: true, removedTag: tagToDelete });
});

router.delete("/:id", (req, res) => {
  let recipes = readRecipes();
  const index = recipes.findIndex(r => r.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Recipe not found" });

  const deleted = recipes.splice(index, 1)[0];
  writeRecipes(recipes);
  res.json(deleted);
});



module.exports = router;

