import { cleanIngredient, groupIngredients } from "./recipes";

let idSeq = 0;
const nextId = (prefix) => `${prefix}${(idSeq += 1)}`;

export const emptyIngredient = () => ({
  id: nextId("ing"),
  name: "",
  amount: "",
  unit: "g",
  note: "",
});

export const newBlock = (group = null, items) => ({
  id: nextId("blk"),
  group,
  items: items?.length ? items : [emptyIngredient()],
});

export function toBlocks(ingredients) {
  const blocks = groupIngredients(ingredients).map((block) =>
    newBlock(
      block.group,
      block.items.map(({ group, ...item }) => ({
        id: nextId("ing"),
        note: "",
        ...item,
      })),
    ),
  );

  return blocks.length ? blocks : [newBlock(null)];
}

export function flattenBlocks(blocks) {
  return (blocks || []).flatMap((block) =>
    block.items.map(({ id, ...item }) =>
      cleanIngredient({ ...item, group: block.group ?? "" }),
    ),
  );
}

export function moveIngredient(blocks, from, to) {
  const fromBlock = blocks.findIndex((block) => block.id === from?.blockId);
  const toBlock = blocks.findIndex((block) => block.id === to?.blockId);
  if (fromBlock < 0 || toBlock < 0) return blocks;

  const item = blocks[fromBlock].items[from.index];
  if (!item) return blocks;

  const next = blocks.map((block) => ({ ...block, items: [...block.items] }));
  next[fromBlock].items.splice(from.index, 1);

  let index = to.index;
  if (index != null && fromBlock === toBlock && from.index < index) index -= 1;
  if (index == null || index > next[toBlock].items.length) {
    index = next[toBlock].items.length;
  }

  next[toBlock].items.splice(index, 0, item);
  return next;
}

export function ungroupBlock(blocks, blockId) {
  const cleared = (blocks || []).map((block) =>
    block.id === blockId ? { ...block, group: null } : block,
  );

  const merged = [];
  for (const block of cleared) {
    const last = merged[merged.length - 1];
    if (last && last.group === null && block.group === null) {
      merged[merged.length - 1] = {
        ...last,
        items: [...last.items, ...block.items],
      };
    } else {
      merged.push(block);
    }
  }

  return merged;
}
