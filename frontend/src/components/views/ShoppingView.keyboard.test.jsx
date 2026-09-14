// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShoppingView from "./ShoppingView";

const item = (id, name) => ({ id, name, amount: 2, unit: "db", done: false });

const groupsWith = (...items) => [{ category: "Zöldség", items }];

const baseProps = {
  openCount: 3,
  doneCount: 0,
  units: ["db", "g"],
  recommendations: { essential: [], goodToHave: [], extra: [] },
  isMobile: false,
  colorFor: () => "#fff",
  onToggleDone: () => {},
  onUpdateItem: () => {},
  onDeleteItem: () => Promise.resolve(),
  onAddItem: () => {},
  onClearDone: () => {},
  onClearAll: () => {},
  onMoveToFridge: () => {},
};

const rows = () => screen.getAllByRole("listitem");
const header = () => screen.getByRole("button", { name: /Zöldség/ });

afterEach(cleanup);

describe("ShoppingView keyboard navigation", () => {
  const threeItems = () =>
    groupsWith(item("a", "Alma"), item("b", "Bab"), item("c", "Cékla"));

  it("walks down the rows with the arrow keys", () => {
    render(<ShoppingView {...baseProps} groups={threeItems()} />);
    const [first, second, third] = rows();

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: "ArrowDown" });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, { key: "ArrowUp" });
    expect(document.activeElement).toBe(second);
  });

  it("reaches the card header above the first row", () => {
    render(<ShoppingView {...baseProps} groups={threeItems()} />);
    rows()[0].focus();
    fireEvent.keyDown(rows()[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(header());
  });

  it("keeps a single tab stop for the whole list", () => {
    render(<ShoppingView {...baseProps} groups={threeItems()} />);
    const stops = [header(), ...rows()].filter((el) => el.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(header());
  });

  it("moves the tab stop to whatever was focused last", () => {
    render(<ShoppingView {...baseProps} groups={threeItems()} />);
    fireEvent.focus(rows()[2]);
    expect(rows()[2].tabIndex).toBe(0);
    expect(rows()[0].tabIndex).toBe(-1);
    expect(header().tabIndex).toBe(-1);
  });

  it("steps the amount with '+' and '-'", () => {
    const onUpdateItem = vi.fn();
    render(
      <ShoppingView {...baseProps} groups={threeItems()} onUpdateItem={onUpdateItem} />,
    );
    fireEvent.keyDown(rows()[0], { key: "+" });
    fireEvent.keyDown(rows()[0], { key: "-" });
    expect(onUpdateItem.mock.calls.map((call) => call[1])).toEqual([1, -1]);
  });

  it("leaves the left and right arrows alone", () => {
    const onUpdateItem = vi.fn();
    render(
      <ShoppingView {...baseProps} groups={threeItems()} onUpdateItem={onUpdateItem} />,
    );

    const right = fireEvent.keyDown(rows()[0], { key: "ArrowRight" });
    const left = fireEvent.keyDown(rows()[0], { key: "ArrowLeft" });

    expect(onUpdateItem).not.toHaveBeenCalled();
    expect(right).toBe(true);
    expect(left).toBe(true);
    expect(document.activeElement).not.toBe(rows()[1]);
  });

  it("ticks an item off with Space", () => {
    const onToggleDone = vi.fn();
    render(
      <ShoppingView {...baseProps} groups={threeItems()} onToggleDone={onToggleDone} />,
    );
    fireEvent.keyDown(rows()[1], { key: " " });
    expect(onToggleDone).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b" }),
    );
  });

  it("asks to delete on Delete and on Backspace", () => {
    const onDeleteItem = vi.fn(() => Promise.resolve());
    render(
      <ShoppingView {...baseProps} groups={threeItems()} onDeleteItem={onDeleteItem} />,
    );
    fireEvent.keyDown(rows()[0], { key: "Delete" });
    fireEvent.keyDown(rows()[1], { key: "Backspace" });
    expect(onDeleteItem.mock.calls.map(([i]) => i.id)).toEqual(["a", "b"]);
  });

  it("moves the focus to the next row after a delete", async () => {
    const onDeleteItem = vi.fn(() => Promise.resolve());
    const { rerender } = render(
      <ShoppingView {...baseProps} groups={threeItems()} onDeleteItem={onDeleteItem} />,
    );
    rows()[1].focus();
    fireEvent.keyDown(rows()[1], { key: "Delete" });

    rerender(
      <ShoppingView
        {...baseProps}
        groups={groupsWith(item("a", "Alma"), item("c", "Cékla"))}
        onDeleteItem={onDeleteItem}
      />,
    );

    await waitFor(() =>
      expect(document.activeElement).toHaveProperty("ariaLabel", "Cékla"),
    );
  });

  it("falls back to the previous row when the last one is deleted", async () => {
    const onDeleteItem = vi.fn(() => Promise.resolve());
    const { rerender } = render(
      <ShoppingView {...baseProps} groups={threeItems()} onDeleteItem={onDeleteItem} />,
    );
    rows()[2].focus();
    fireEvent.keyDown(rows()[2], { key: "Delete" });

    rerender(
      <ShoppingView
        {...baseProps}
        groups={groupsWith(item("a", "Alma"), item("b", "Bab"))}
        onDeleteItem={onDeleteItem}
      />,
    );

    await waitFor(() =>
      expect(document.activeElement).toHaveProperty("ariaLabel", "Bab"),
    );
  });

  it("leaves every arrow alone on a category header", () => {
    render(<ShoppingView {...baseProps} groups={threeItems()} />);
    expect(header().getAttribute("aria-expanded")).toBe("true");

    const left = fireEvent.keyDown(header(), { key: "ArrowLeft" });
    const right = fireEvent.keyDown(header(), { key: "ArrowRight" });

    expect(header().getAttribute("aria-expanded")).toBe("true");
    expect(left).toBe(true);
    expect(right).toBe(true);
  });

  it("still collapses the card by activating the header", () => {
    render(<ShoppingView {...baseProps} groups={threeItems()} />);

    fireEvent.click(header());

    expect(header().getAttribute("aria-expanded")).toBe("false");
  });
});

describe("ShoppingView navigation across a grid of cards", () => {
  const place = (element, x, y, w = 400, h = 28) => {
    element.getBoundingClientRect = () => ({
      x,
      y,
      left: x,
      top: y,
      right: x + w,
      bottom: y + h,
      width: w,
      height: h,
    });
  };

  const COLUMNS = {
    Zöldség: [0, 0],
    Gyümölcs: [500, 0],
    Pékáru: [0, 300],
  };

  const layOut = () => {
    for (const card of document.querySelectorAll(".group-card")) {
      const name = card.querySelector(".group-name").textContent;
      const [x, top] = COLUMNS[name];
      card.querySelectorAll("[data-kbd-item]").forEach((element, i) => {
        place(element, x, top + i * 40);
      });
    }
  };

  const twoColumns = () => [
    { category: "Zöldség", items: [item("a", "Alma"), item("b", "Bab")] },
    { category: "Gyümölcs", items: [item("c", "Citrom")] },
    { category: "Pékáru", items: [item("k", "Kifli")] },
  ];

  const row = (name) => screen.getByRole("listitem", { name });

  const renderGrid = () => {
    render(<ShoppingView {...baseProps} groups={twoColumns()} />);
    layOut();
  };

  it("goes to the card below, not the one beside it", () => {
    renderGrid();
    row("Bab").focus();

    fireEvent.keyDown(row("Bab"), { key: "ArrowDown" });

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /Pékáru/ }),
    );
  });

  it("still walks the rows inside one card", () => {
    renderGrid();
    row("Alma").focus();

    fireEvent.keyDown(row("Alma"), { key: "ArrowDown" });

    expect(document.activeElement).toBe(row("Bab"));
  });

  it("comes back up the same way", () => {
    renderGrid();
    const bakery = screen.getByRole("button", { name: /Pékáru/ });
    bakery.focus();

    fireEvent.keyDown(bakery, { key: "ArrowUp" });

    expect(document.activeElement).toBe(row("Bab"));
  });

  it("gives Up back to the page from the top of a column", () => {
    renderGrid();
    const fruit = screen.getByRole("button", { name: /Gyümölcs/ });
    fruit.focus();

    const up = fireEvent.keyDown(fruit, { key: "ArrowUp" });

    expect(up).toBe(true);
    expect(document.activeElement).toBe(fruit);
  });

  it("leaves the horizontal arrows to the page-wide navigation", () => {
    renderGrid();
    row("Alma").focus();

    const right = fireEvent.keyDown(row("Alma"), { key: "ArrowRight" });

    expect(right).toBe(true);
    expect(document.activeElement).toBe(row("Alma"));
  });
});
