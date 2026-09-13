// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "@testing-library/react";
import Icon from "../Icon/Icon";
import {
  AddItemRow,
  ColorEditToggle,
  GroupCard,
  ItemRow,
} from "./GroupedItems";

const noop = () => {};
const baseProps = {
  name: "tej",
  qtyLabel: "1 l",
  onIncrement: noop,
  onDecrement: noop,
  onDelete: noop,
};

const thumb = () => document.querySelector(".item-thumb");

afterEach(cleanup);

describe("ItemRow thumbnail", () => {
  it("renders the conventional path for a catalog key", () => {
    render(<ItemRow {...baseProps} nameKey="tej" />);
    expect(thumb().getAttribute("src")).toBe("/pantry/tej.avif");
  });

  it("slugs a multi-word key", () => {
    render(<ItemRow {...baseProps} name="vaj / margarin" nameKey="vaj margarin" />);
    expect(thumb().getAttribute("src")).toBe("/pantry/vaj-margarin.avif");
  });

  it("prefers an explicit imageUrl", () => {
    render(
      <ItemRow {...baseProps} nameKey="tej" imageUrl="https://cdn/x/milk.webp" />,
    );
    expect(thumb().getAttribute("src")).toBe("https://cdn/x/milk.webp");
  });

  it("drops the image when it fails to load, leaving the row intact", () => {
    render(<ItemRow {...baseProps} nameKey="nincs ilyen" />);
    expect(thumb()).not.toBeNull();

    fireEvent.error(thumb());

    expect(thumb()).toBeNull();
    expect(screen.getByText("tej")).toBeTruthy();
  });

  it("renders no image when the item has no key", () => {
    render(<ItemRow {...baseProps} nameKey="" />);
    expect(thumb()).toBeNull();
  });

  it("renders no image on mobile (showThumb=false)", () => {
    render(<ItemRow {...baseProps} nameKey="tej" showThumb={false} />);
    expect(thumb()).toBeNull();
  });

  it("marks the thumbnail decorative, so the name is the only label", () => {
    render(<ItemRow {...baseProps} nameKey="tej" />);
    expect(thumb().getAttribute("alt")).toBe("");
    expect(thumb().getAttribute("aria-hidden")).toBe("true");
    expect(thumb().getAttribute("loading")).toBe("lazy");
  });
});

const editable = (props) => ({
  ...baseProps,
  amount: 2,
  unit: "l",
  units: ["db", "g", "l"],
  ...props,
});

const amountField = () => screen.getByLabelText("Mennyiség");
const unitSelect = () => screen.getByLabelText("Mértékegység");
const editButton = () => screen.getByLabelText("tej szerkesztése");
const stepper = () => screen.queryByLabelText("Növelés");
const bin = () => screen.queryByLabelText("tej törlése");
const startEdit = () => fireEvent.click(editButton());

describe("ItemRow edit toggle", () => {
  it("offers no pencil when the row has no edit handler", () => {
    render(<ItemRow {...baseProps} />);
    expect(screen.getByText("1 l")).toBeTruthy();
    expect(screen.queryByLabelText("tej szerkesztése")).toBeNull();
  });

  it("shows the plain label until the pencil is pressed", () => {
    render(<ItemRow {...editable({ onAmountChange: vi.fn(), onUnitChange: vi.fn() })} />);

    expect(screen.getByText("1 l")).toBeTruthy();
    expect(screen.queryByLabelText("Mennyiség")).toBeNull();
    expect(screen.queryByLabelText("Mértékegység")).toBeNull();

    startEdit();

    expect(screen.queryByText("1 l")).toBeNull();
    expect(amountField()).toBeTruthy();
    expect(unitSelect()).toBeTruthy();
  });

  it("puts the caret in the amount field it just revealed", () => {
    render(<ItemRow {...editable({ onAmountChange: vi.fn() })} />);
    startEdit();
    expect(document.activeElement).toBe(amountField());
  });

  it("closes again on a second press", () => {
    render(<ItemRow {...editable({ onAmountChange: vi.fn() })} />);
    startEdit();
    fireEvent.click(editButton());

    expect(screen.queryByLabelText("Mennyiség")).toBeNull();
    expect(screen.getByText("1 l")).toBeTruthy();
  });

  it("closes on Enter and on Escape", () => {
    render(<ItemRow {...editable({ onAmountChange: vi.fn() })} />);

    startEdit();
    fireEvent.keyDown(amountField(), { key: "Enter" });
    expect(screen.queryByLabelText("Mennyiség")).toBeNull();

    startEdit();
    fireEvent.keyDown(amountField(), { key: "Escape" });
    expect(screen.queryByLabelText("Mennyiség")).toBeNull();
  });

  it("keeps the stepper and the bin out of a closed row", () => {
    render(<ItemRow {...editable({ onAmountChange: vi.fn() })} />);

    expect(stepper()).toBeNull();
    expect(screen.queryByLabelText("Csökkentés")).toBeNull();
    expect(bin()).toBeNull();
    expect(screen.getByText("1 l")).toBeTruthy();

    startEdit();

    expect(stepper()).toBeTruthy();
    expect(screen.getByLabelText("Csökkentés")).toBeTruthy();
    expect(bin()).toBeTruthy();
  });

  it("leaves the stepper and the bin on show without a pencil", () => {
    render(<ItemRow {...baseProps} />);

    expect(stepper()).toBeTruthy();
    expect(bin()).toBeTruthy();
  });

  it("still steps and deletes from the keyboard while closed", () => {
    const onIncrement = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <ItemRow {...editable({ onAmountChange: vi.fn(), onIncrement, onDelete })} />,
    );
    const row = container.querySelector(".item-row");

    fireEvent.keyDown(row, { key: "ArrowRight" });
    fireEvent.keyDown(row, { key: "Delete" });

    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("edits only the row whose pencil was pressed", () => {
    render(
      <>
        <ItemRow {...editable({ onAmountChange: vi.fn() })} />
        <ItemRow {...editable({ name: "vaj", onAmountChange: vi.fn() })} />
      </>,
    );

    startEdit();

    expect(screen.getAllByLabelText("Mennyiség")).toHaveLength(1);
  });
});

describe("ItemRow amount and unit editing", () => {
  it("commits a typed amount on blur", () => {
    const onAmountChange = vi.fn();
    render(<ItemRow {...editable({ onAmountChange })} />);
    startEdit();

    fireEvent.change(amountField(), { target: { value: "150" } });
    expect(onAmountChange).not.toHaveBeenCalled();

    fireEvent.blur(amountField());
    expect(onAmountChange).toHaveBeenCalledWith(150);
  });

  it("commits on Enter", () => {
    const onAmountChange = vi.fn();
    render(<ItemRow {...editable({ onAmountChange })} />);
    startEdit();

    fireEvent.change(amountField(), { target: { value: "7" } });
    fireEvent.keyDown(amountField(), { key: "Enter" });

    expect(onAmountChange).toHaveBeenCalledWith(7);
  });

  it("abandons the edit on Escape", () => {
    const onAmountChange = vi.fn();
    render(<ItemRow {...editable({ onAmountChange })} />);
    startEdit();

    fireEvent.change(amountField(), { target: { value: "99" } });
    fireEvent.keyDown(amountField(), { key: "Escape" });

    expect(screen.queryByLabelText("Mennyiség")).toBeNull();
    expect(onAmountChange).not.toHaveBeenCalled();
  });

  it("writes nothing for a zero, a blank or an unchanged amount", () => {
    const onAmountChange = vi.fn();
    render(<ItemRow {...editable({ onAmountChange })} />);
    startEdit();

    for (const value of ["0", "", "-3", "2"]) {
      fireEvent.change(amountField(), { target: { value } });
      fireEvent.blur(amountField());
    }

    expect(onAmountChange).not.toHaveBeenCalled();
  });

  it("follows the stored amount again once the edit is committed", () => {
    const { rerender } = render(<ItemRow {...editable({ onAmountChange: vi.fn() })} />);
    startEdit();
    fireEvent.change(amountField(), { target: { value: "5" } });
    fireEvent.blur(amountField());

    rerender(<ItemRow {...editable({ amount: 5, onAmountChange: vi.fn() })} />);
    expect(amountField().value).toBe("5");
    expect(screen.queryByText("1 l")).toBeNull();
  });

  it("reports the picked unit", () => {
    const onUnitChange = vi.fn();
    render(<ItemRow {...editable({ onUnitChange })} />);
    startEdit();

    fireEvent.change(unitSelect(), { target: { value: "g" } });
    expect(onUnitChange).toHaveBeenCalledWith("g");
  });

  it("hands the unit box the selected unit to size itself by", () => {
    const { rerender } = render(
      <ItemRow {...editable({ unit: "l", onUnitChange: vi.fn() })} />,
    );
    startEdit();

    const sizerUnit = () =>
      document.querySelector(".item-unit-wrap")?.getAttribute("data-unit");
    expect(sizerUnit()).toBe("l");

    rerender(<ItemRow {...editable({ unit: "konzerv", onUnitChange: vi.fn() })} />);
    expect(sizerUnit()).toBe("konzerv");
    rerender(<ItemRow {...editable({ unit: "zacskó", onUnitChange: vi.fn() })} />);
    expect(sizerUnit()).toBe("zacskó");
  });

  it("keeps a unit that is not on the list selectable", () => {
    render(<ItemRow {...editable({ unit: "zacskó", onUnitChange: vi.fn() })} />);
    startEdit();

    expect(unitSelect().value).toBe("zacskó");
    expect(
      [...unitSelect().options].map((option) => option.value),
    ).toEqual(["zacskó", "db", "g", "l"]);
  });
});

const noteField = () => screen.queryByLabelText("Saját megjegyzés");

describe("ItemRow user note", () => {
  it("keeps the note a plain line until the row is opened", () => {
    render(
      <ItemRow
        {...editable({
          note: "reszelt · recept: 500 g · akciós",
          userNote: "akciós",
          onNoteChange: vi.fn(),
        })}
      />,
    );

    expect(screen.getByText("reszelt · recept: 500 g · akciós")).toBeTruthy();
    expect(noteField()).toBeNull();

    startEdit();

    expect(screen.queryByText("reszelt · recept: 500 g · akciós")).toBeNull();
    expect(noteField().value).toBe("akciós");
  });

  it("offers no field when the caller cannot store a note", () => {
    render(<ItemRow {...editable({ onAmountChange: vi.fn() })} />);
    startEdit();
    expect(noteField()).toBeNull();
  });

  it("commits a typed note on blur and on Enter", () => {
    const onNoteChange = vi.fn();
    render(<ItemRow {...editable({ onNoteChange })} />);
    startEdit();

    fireEvent.change(noteField(), { target: { value: " a nagyobbat " } });
    expect(onNoteChange).not.toHaveBeenCalled();

    fireEvent.blur(noteField());
    expect(onNoteChange).toHaveBeenCalledWith("a nagyobbat");

    fireEvent.change(noteField(), { target: { value: "akciós" } });
    fireEvent.keyDown(noteField(), { key: "Enter" });
    expect(onNoteChange).toHaveBeenCalledWith("akciós");
  });

  it("abandons the edit on Escape", () => {
    const onNoteChange = vi.fn();
    render(<ItemRow {...editable({ userNote: "régi", onNoteChange })} />);
    startEdit();

    fireEvent.change(noteField(), { target: { value: "új" } });
    fireEvent.keyDown(noteField(), { key: "Escape" });

    expect(noteField()).toBeNull();
    expect(onNoteChange).not.toHaveBeenCalled();
  });

  it("writes nothing for an unchanged note", () => {
    const onNoteChange = vi.fn();
    render(<ItemRow {...editable({ userNote: "akciós", onNoteChange })} />);
    startEdit();

    fireEvent.change(noteField(), { target: { value: "akciós" } });
    fireEvent.blur(noteField());

    expect(onNoteChange).not.toHaveBeenCalled();
  });

  it("passes the cap on to the field", () => {
    render(<ItemRow {...editable({ onNoteChange: vi.fn(), noteMaxLength: 120 })} />);
    startEdit();
    expect(noteField().getAttribute("maxlength")).toBe("120");
  });

  it("offers the pencil for a row that can only take a note", () => {
    render(
      <ItemRow {...baseProps} userNote="akciós" onNoteChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("tej szerkesztése")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("tej szerkesztése"));
    expect(noteField()).toBeTruthy();
  });

  it("leaves the caret in the amount field", () => {
    render(<ItemRow {...editable({ onAmountChange: vi.fn(), onNoteChange: vi.fn() })} />);
    startEdit();
    expect(document.activeElement).toBe(amountField());
  });
});

const card = (props) => ({
  accent: "#ffcc00",
  category: "Zöldségek",
  meta: "3 tétel",
  open: false,
  onToggle: noop,
  onColorChange: vi.fn(),
  ...props,
});

const iconPath = (root) => root.querySelector("svg path").getAttribute("d");
const renderIcon = (name) => {
  const host = document.createElement("div");
  render(<Icon name={name} />, { container: document.body.appendChild(host) });
  return host;
};

const colorDot = () =>
  screen.queryByLabelText("Zöldségek színének módosítása");
const colorPanel = () => screen.queryByRole("group", { name: "Zöldségek színe" });

describe("GroupCard colour dot", () => {
  it("shows the dot but will not open it while colour editing is off", () => {
    render(<GroupCard {...card()} />);

    expect(colorDot()).toBeTruthy();
    expect(colorDot().disabled).toBe(true);

    fireEvent.click(colorDot());
    expect(colorPanel()).toBeNull();
  });

  it("opens the picker once colour editing is on", () => {
    render(<GroupCard {...card({ colorEditing: true })} />);

    expect(colorDot().disabled).toBe(false);
    fireEvent.click(colorDot());
    expect(colorPanel()).toBeTruthy();
  });

  it("renders no dot at all when the caller cannot change colours", () => {
    render(<GroupCard {...card({ onColorChange: undefined, colorEditing: true })} />);
    expect(colorDot()).toBeNull();
  });

  it("closes an open picker when colour editing is switched off", () => {
    const { rerender } = render(<GroupCard {...card({ colorEditing: true })} />);
    fireEvent.click(colorDot());
    expect(colorPanel()).toBeTruthy();

    rerender(<GroupCard {...card({ colorEditing: false })} />);
    expect(colorPanel()).toBeNull();

    rerender(<GroupCard {...card({ colorEditing: true })} />);
    expect(colorPanel()).toBeNull();
  });

  it("reports the picked colour and closes", () => {
    const onColorChange = vi.fn();
    render(<GroupCard {...card({ colorEditing: true, onColorChange })} />);
    fireEvent.click(colorDot());

    const swatch = colorPanel().querySelector(".color-swatch");
    fireEvent.click(swatch);

    expect(onColorChange).toHaveBeenCalledTimes(1);
    expect(colorPanel()).toBeNull();
  });
});

describe("ColorEditToggle", () => {
  it("stays out of the way when there is no card to recolour", () => {
    const { container } = render(
      <ColorEditToggle groupCount={0} active={false} onToggle={noop} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("reports its state and reacts to a press", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ColorEditToggle groupCount={2} active={false} onToggle={onToggle} />,
    );

    const button = screen.getByRole("button", { name: "Színek szerkesztése" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.className).toContain("btn-outline-neutral");
    expect(iconPath(button)).toBe(iconPath(renderIcon("xmark")));

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<ColorEditToggle groupCount={2} active onToggle={onToggle} />);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.className).not.toContain("btn-outline-neutral");
    expect(iconPath(button)).toBe(iconPath(renderIcon("check")));
  });
});

const SPENOT = {
  key: "spenot",
  name: "spenót",
  category: "Zöldségek",
  priority: "extra",
  purchase: { unit: "g", amount: 200 },
  imageUrl: null,
};
const SO = {
  key: "so",
  name: "só",
  category: "Fűszerek",
  priority: "essential",
  purchase: null,
  imageUrl: null,
};

const CATALOG = [SPENOT, SO];
const addSuggest = (query) =>
  query
    ? CATALOG.filter((entry) => entry.key.startsWith(query)).map((entry) => ({
        entry,
        alias: null,
      }))
    : [];

const UNITS = ["db", "g", "kg"];
const addName = () => screen.getByPlaceholderText("Tétel hozzáadása");
const addAmount = () => screen.getByPlaceholderText("menny.");
const suggestion = () =>
  within(screen.getByRole("listbox")).getAllByRole("option")[0];

describe("AddItemRow with catalog suggestions", () => {
  it("fills the name and the package the item is sold in", () => {
    render(<AddItemRow units={UNITS} onAdd={noop} suggest={addSuggest} />);

    fireEvent.change(addName(), { target: { value: "spe" } });
    fireEvent.click(suggestion());

    expect(addName().value).toBe("spenót");
    expect(addAmount().value).toBe("200");
    expect(screen.getByLabelText("Mértékegység").value).toBe("g");
  });

  it("falls back to a single piece with no package data", () => {
    render(<AddItemRow units={UNITS} onAdd={noop} suggest={addSuggest} />);

    fireEvent.change(addName(), { target: { value: "so" } });
    fireEvent.click(suggestion());

    expect(addAmount().value).toBe("1");
    expect(screen.getByLabelText("Mértékegység").value).toBe("db");
  });

  it("keeps an amount the user has already typed", () => {
    render(<AddItemRow units={UNITS} onAdd={noop} suggest={addSuggest} />);

    fireEvent.change(addAmount(), { target: { value: "500" } });
    fireEvent.change(addName(), { target: { value: "spe" } });
    fireEvent.click(suggestion());

    expect(addName().value).toBe("spenót");
    expect(addAmount().value).toBe("500");
    expect(screen.getByLabelText("Mértékegység").value).toBe("db");
  });

  it("adds the picked item with one more Enter, then clears the row", () => {
    const onAdd = vi.fn();
    render(<AddItemRow units={UNITS} onAdd={onAdd} suggest={addSuggest} />);

    fireEvent.change(addName(), { target: { value: "spe" } });
    fireEvent.keyDown(addName(), { key: "ArrowDown" });
    fireEvent.keyDown(addName(), { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();

    fireEvent.keyDown(addName(), { key: "Enter" });
    expect(onAdd).toHaveBeenCalledWith({
      name: "spenót",
      amount: 200,
      unit: "g",
    });
    expect(addName().value).toBe("");
  });

  it("still adds a name the catalog does not know", () => {
    const onAdd = vi.fn();
    render(<AddItemRow units={UNITS} onAdd={onAdd} suggest={addSuggest} />);

    fireEvent.change(addName(), { target: { value: "nagymama süteménye" } });
    fireEvent.change(addAmount(), { target: { value: "2" } });
    fireEvent.keyDown(addName(), { key: "Enter" });

    expect(onAdd).toHaveBeenCalledWith({
      name: "nagymama süteménye",
      amount: 2,
      unit: "db",
    });
  });
});
