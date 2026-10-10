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
