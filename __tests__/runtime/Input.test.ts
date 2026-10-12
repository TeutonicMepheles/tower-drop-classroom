import { bindInput } from "@/runtime/input";
it("ignores UI descendants, accepts the play surface and unbinds", () => {
  const drop = jest.fn(),
    unbind = bindInput(drop);
  const button = document.createElement("button");
  button.innerHTML = "<span>reward</span>";
  document.body.append(button);
  button.firstElementChild!.dispatchEvent(
    new MouseEvent("click", { bubbles: true })
  );
  expect(drop).not.toHaveBeenCalled();
  window.dispatchEvent(new MouseEvent("click"));
  expect(drop).toHaveBeenCalledTimes(1);
  unbind();
  window.dispatchEvent(new MouseEvent("click"));
  expect(drop).toHaveBeenCalledTimes(1);
  button.remove();
});

const pointerEvent = (
  type: string,
  id = 1,
  x = 50,
  primary = true
): PointerEvent => {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: 50,
    button: 0,
  });
  Object.defineProperties(event, {
    pointerId: { value: id },
    isPrimary: { value: primary },
  });
  return event as PointerEvent;
};
const gesture = (): {
  canvas: HTMLCanvasElement;
  drop: jest.Mock;
  options: {
    surface: HTMLCanvasElement;
    hitTest: jest.Mock;
    open: jest.Mock;
    close: jest.Mock;
    use: jest.Mock;
    isOpen: jest.Mock;
    pointAt: jest.Mock;
  };
  unbind: () => void;
} => {
  const canvas = document.createElement("canvas");
  document.body.append(canvas);
  let open = false;
  const drop = jest.fn();
  const options = {
    surface: canvas,
    hitTest: jest.fn(() => true),
    open: jest.fn(() => {
      open = true;
      return true;
    }),
    close: jest.fn(() => {
      open = false;
    }),
    use: jest.fn(() => true),
    isOpen: jest.fn(() => open),
    pointAt: jest.fn(
      () => null as "magnet" | "repair" | "freeze" | "cancel" | null
    ),
  };
  const unbind = bindInput(drop, options);
  return {
    canvas,
    drop,
    options,
    unbind: (): void => {
      unbind();
      canvas.remove();
    },
  };
};
describe("pointer gestures", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = "";
  });
  it("short press drops once and consumes the generated click", () => {
    const g = gesture();
    g.canvas.dispatchEvent(pointerEvent("pointerdown"));
    jest.advanceTimersByTime(100);
    g.canvas.dispatchEvent(pointerEvent("pointerup"));
    g.canvas.click();
    expect(g.drop).toHaveBeenCalledTimes(1);
    expect(g.options.open).not.toHaveBeenCalled();
    g.unbind();
  });
  it("holds its initial hit, drags to the card and never falls through to a newly revealed reward", () => {
    const g = gesture();
    g.canvas.dispatchEvent(pointerEvent("pointerdown"));
    jest.advanceTimersByTime(300);
    expect(g.options.open).toHaveBeenCalledTimes(1);
    g.options.pointAt.mockReturnValue("magnet");
    window.dispatchEvent(pointerEvent("pointermove", 1, 500));
    window.dispatchEvent(pointerEvent("pointerup", 1, 500));
    const reward = document.createElement("button");
    document.body.append(reward);
    const choose = jest.fn();
    reward.addEventListener("click", choose);
    reward.click();
    expect(g.options.use).toHaveBeenCalledTimes(1);
    expect(g.drop).not.toHaveBeenCalled();
    expect(choose).not.toHaveBeenCalled();
    reward.dispatchEvent(pointerEvent("pointerdown"));
    reward.click();
    expect(choose).toHaveBeenCalledTimes(1);
    g.unbind();
  });
  it("cancels release outside the card without a placement", () => {
    const g = gesture();
    g.canvas.dispatchEvent(pointerEvent("pointerdown"));
    jest.advanceTimersByTime(300);
    window.dispatchEvent(pointerEvent("pointerup"));
    g.canvas.click();
    expect(g.options.use).not.toHaveBeenCalled();
    expect(g.drop).not.toHaveBeenCalled();
    expect(g.options.close).toHaveBeenCalled();
    g.unbind();
  });
  it.each(["pointercancel", "blur"])(
    "clears pending and active gestures on %s",
    (type) => {
      const g = gesture();
      g.canvas.dispatchEvent(pointerEvent("pointerdown"));
      window.dispatchEvent(new Event(type));
      jest.advanceTimersByTime(400);
      window.dispatchEvent(pointerEvent("pointerup"));
      g.canvas.click();
      expect(g.options.open).not.toHaveBeenCalled();
      expect(g.drop).not.toHaveBeenCalled();
      g.unbind();
    }
  );
  it("does not release a block when the menu expired while holding", () => {
    const g = gesture();
    g.canvas.dispatchEvent(pointerEvent("pointerdown"));
    jest.advanceTimersByTime(300);
    g.options.close();
    window.dispatchEvent(pointerEvent("pointerup"));
    g.canvas.click();
    expect(g.drop).not.toHaveBeenCalled();
    expect(g.options.use).not.toHaveBeenCalled();
    g.unbind();
  });
  it("rejects secondary touch and removes timers and handlers on disposal", () => {
    const g = gesture();
    g.canvas.dispatchEvent(pointerEvent("pointerdown"));
    g.canvas.dispatchEvent(pointerEvent("pointerdown", 2, 50, false));
    jest.advanceTimersByTime(500);
    expect(g.options.open).not.toHaveBeenCalled();
    g.unbind();
    window.dispatchEvent(pointerEvent("pointerup"));
    expect(g.drop).not.toHaveBeenCalled();
  });
});

it("Escape cancels an active gesture and disposal clears a pending hold", () => {
  jest.useFakeTimers();
  const g = gesture();
  g.canvas.dispatchEvent(pointerEvent("pointerdown"));
  jest.advanceTimersByTime(300);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  window.dispatchEvent(pointerEvent("pointerup"));
  g.canvas.click();
  expect(g.options.use).not.toHaveBeenCalled();
  expect(g.drop).not.toHaveBeenCalled();
  g.canvas.dispatchEvent(pointerEvent("pointerdown"));
  g.unbind();
  jest.advanceTimersByTime(1000);
  expect(g.options.open).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

it.each(["repair", "freeze"] as const)(
  "drag release dispatches %s without dropping",
  (id) => {
    jest.useFakeTimers();
    const g = gesture();
    g.canvas.dispatchEvent(pointerEvent("pointerdown"));
    jest.advanceTimersByTime(300);
    g.options.pointAt.mockReturnValue(id);
    window.dispatchEvent(pointerEvent("pointerup"));
    g.canvas.click();
    expect(g.options.use).toHaveBeenCalledWith(id);
    expect(g.drop).not.toHaveBeenCalled();
    g.unbind();
    jest.useRealTimers();
  }
);
