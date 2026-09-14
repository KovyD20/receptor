// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useSpatialNav } from "./useSpatialNav";

const place = (element, x, y, w = 40, h = 20) => {
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

function Page({ onFallback, children }) {
  useSpatialNav({ onFallback });
  return <div>{children}</div>;
}

const btn = (name) => screen.getByRole("button", { name });

afterEach(cleanup);

describe("useSpatialNav", () => {
  const grid = () => {
    render(
      <Page>
        <button type="button">bal</button>
        <button type="button">jobb</button>
        <button type="button">alsó</button>
        <button type="button">tavoli</button>
      </Page>,
    );
    place(btn("bal"), 0, 0);
    place(btn("jobb"), 100, 0);
    place(btn("alsó"), 0, 100);
    place(btn("tavoli"), 600, 90);
  };

  it("moves to the nearest element in the pressed direction", () => {
    grid();
    btn("bal").focus();

    fireEvent.keyDown(btn("bal"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(btn("jobb"));

    fireEvent.keyDown(btn("jobb"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(btn("bal"));
  });

  it("prefers the element it overlaps with on the cross axis", () => {
    grid();
    btn("bal").focus();
    fireEvent.keyDown(btn("bal"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(btn("alsó"));
  });

  it("leaves the key alone when nothing lies that way, so the page can scroll", () => {
    grid();
    btn("bal").focus();
    const event = new KeyboardEvent("keydown", {
      key: "ArrowUp",
      bubbles: true,
      cancelable: true,
    });
    btn("bal").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(btn("bal"));
  });

  it("ignores a key a component below already handled", () => {
    grid();
    btn("bal").focus();
    const event = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    btn("bal").dispatchEvent(event);
    expect(document.activeElement).toBe(btn("bal"));
  });

  it("skips elements taken out of the tab order", () => {
    render(
      <Page>
        <button type="button">start</button>
        <button type="button" tabIndex={-1}>
          rejtett
        </button>
        <button type="button">cel</button>
      </Page>,
    );
    place(btn("start"), 0, 0);
    place(btn("rejtett"), 50, 0);
    place(btn("cel"), 100, 0);
    btn("start").focus();

    fireEvent.keyDown(btn("start"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(btn("cel"));
  });

  it("stays inside an open modal", () => {
    render(
      <Page>
        <button type="button">hatter</button>
        <div role="dialog" aria-modal="true">
          <button type="button">modal-egy</button>
          <button type="button">modal-ketto</button>
        </div>
      </Page>,
    );
    place(btn("hatter"), 0, 0);
    place(btn("modal-egy"), 0, 200);
    place(btn("modal-ketto"), 100, 200);
    btn("modal-egy").focus();

    fireEvent.keyDown(btn("modal-egy"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(btn("modal-egy"));

    fireEvent.keyDown(btn("modal-egy"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(btn("modal-ketto"));
  });

  it("moves onto a roving list item that is out of the tab order", () => {
    render(
      <Page>
        <button type="button">sor</button>
        <div data-kbd-item="b" tabIndex={-1} role="listitem" aria-label="masik sor" />
      </Page>,
    );
    const row = screen.getByLabelText("masik sor");
    place(btn("sor"), 0, 0);
    place(row, 100, 0);
    btn("sor").focus();

    fireEvent.keyDown(btn("sor"), { key: "ArrowRight" });

    expect(document.activeElement).toBe(row);
  });

  it("still ignores something merely taken out of the tab order", () => {
    render(
      <Page>
        <button type="button">sor</button>
        <button type="button" tabIndex={-1}>
          rejtett
        </button>
      </Page>,
    );
    place(btn("sor"), 0, 0);
    place(btn("rejtett"), 100, 0);
    btn("sor").focus();

    fireEvent.keyDown(btn("sor"), { key: "ArrowRight" });

    expect(document.activeElement).toBe(btn("sor"));
  });

  describe("inside fields", () => {
    const withField = (field) => {
      render(
        <Page>
          {field}
          <button type="button">alatta</button>
        </Page>,
      );
      const input = screen.getByLabelText("mezo");
      place(input, 0, 0);
      place(btn("alatta"), 0, 100);
      input.focus();
      return input;
    };

    it("lets a single-line text field pass the vertical arrows on", () => {
      const input = withField(<input aria-label="mezo" />);
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(document.activeElement).toBe(btn("alatta"));
    });

    it("keeps the horizontal arrows for the caret", () => {
      const input = withField(<input aria-label="mezo" />);
      input.value = "abc";
      input.setSelectionRange(1, 1);
      fireEvent.keyDown(input, { key: "ArrowRight" });
      expect(document.activeElement).toBe(input);
    });

    const withNeighbour = (value, caret) => {
      render(
        <Page>
          <input aria-label="mezo" />
          <button type="button">mellette</button>
        </Page>,
      );
      const input = screen.getByLabelText("mezo");
      input.value = value;
      input.setSelectionRange(caret, caret);
      place(input, 0, 0);
      place(btn("mellette"), 100, 0);
      input.focus();
      return input;
    };

    it("releases the arrow once the caret is at the end of the text", () => {
      const input = withNeighbour("abc", 3);
      fireEvent.keyDown(input, { key: "ArrowRight" });
      expect(document.activeElement).toBe(btn("mellette"));
    });

    it("releases it at the start of the text going the other way", () => {
      render(
        <Page>
          <button type="button">elotte</button>
          <input aria-label="mezo" />
        </Page>,
      );
      const input = screen.getByLabelText("mezo");
      input.value = "abc";
      input.setSelectionRange(0, 0);
      place(btn("elotte"), 0, 0);
      place(input, 100, 0);
      input.focus();

      fireEvent.keyDown(input, { key: "ArrowLeft" });

      expect(document.activeElement).toBe(btn("elotte"));
    });

    it("an empty field is at both edges at once", () => {
      const input = withNeighbour("", 0);
      fireEvent.keyDown(input, { key: "ArrowRight" });
      expect(document.activeElement).toBe(btn("mellette"));
    });

    it("a selection still belongs to the caret", () => {
      const input = withNeighbour("abc", 3);
      input.setSelectionRange(0, 3);
      fireEvent.keyDown(input, { key: "ArrowRight" });
      expect(document.activeElement).toBe(input);
    });

    it("leaves a number input's vertical arrows to the stepper", () => {
      const input = withField(<input aria-label="mezo" type="number" />);
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(document.activeElement).toBe(input);
    });

    it("lets the horizontal arrows step out of a number input", () => {
      render(
        <Page>
          <input aria-label="mezo" type="number" />
          <button type="button">mellette</button>
        </Page>,
      );
      const input = screen.getByLabelText("mezo");
      place(input, 0, 0);
      place(btn("mellette"), 100, 0);
      input.focus();

      fireEvent.keyDown(input, { key: "ArrowRight" });

      expect(document.activeElement).toBe(btn("mellette"));
    });

    it("keeps every arrow inside a date field, which walks its segments", () => {
      const input = withField(<input aria-label="mezo" type="date" />);
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(document.activeElement).toBe(input);
      fireEvent.keyDown(input, { key: "ArrowRight" });
      expect(document.activeElement).toBe(input);
    });

    it("leaves a textarea's arrows to the caret", () => {
      const input = withField(<textarea aria-label="mezo" />);
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(document.activeElement).toBe(input);
    });

    const withSelect = () => {
      render(
        <Page>
          <select aria-label="mezo">
            <option>db</option>
            <option>g</option>
          </select>
          <button type="button">mellette</button>
          <button type="button">alatta</button>
        </Page>,
      );
      const select = screen.getByLabelText("mezo");
      place(select, 0, 0);
      place(btn("mellette"), 100, 0);
      place(btn("alatta"), 0, 100);
      select.focus();
      return select;
    };

    it("lets the horizontal arrows step out of a select", () => {
      const select = withSelect();
      fireEvent.keyDown(select, { key: "ArrowRight" });
      expect(document.activeElement).toBe(btn("mellette"));
    });

    it("keeps the vertical arrows for the select's own options", () => {
      const select = withSelect();
      fireEvent.keyDown(select, { key: "ArrowDown" });
      expect(document.activeElement).toBe(select);
    });
  });

  describe("exitField", () => {
    function ExitHarness({ onFallback }) {
      const { exitField } = useSpatialNav({ onFallback });
      return (
        <div>
          <input aria-label="mezo" onKeyDown={(e) => e.key === "Escape" && exitField()} />
          <button type="button">alatta</button>
        </div>
      );
    }

    it("moves the focus on, out of the field", () => {
      render(<ExitHarness />);
      const input = screen.getByLabelText("mezo");
      place(input, 0, 0);
      place(btn("alatta"), 0, 100);
      input.focus();

      fireEvent.keyDown(input, { key: "Escape" });
      expect(document.activeElement).toBe(btn("alatta"));
    });

    it("falls back to the caller when there is nowhere to go", () => {
      const onFallback = vi.fn();
      render(<ExitHarness onFallback={onFallback} />);
      const input = screen.getByLabelText("mezo");
      place(input, 0, 200);
      place(btn("alatta"), 0, 0);
      input.focus();

      fireEvent.keyDown(input, { key: "Escape" });
      expect(onFallback).toHaveBeenCalledTimes(1);
    });
  });
});
