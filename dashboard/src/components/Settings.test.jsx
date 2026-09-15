// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Settings from "./Settings";

const dispatch = vi.fn();
const settingsState = {
  loading: false,
  settings: {
    contact_email: "contact@example.test",
    contact_phone: "+243812345678",
    address: "Lubumbashi",
  },
};

vi.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  useSelector: (selector) => selector({ settings: settingsState }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../store/slices/settingsSlice", () => ({
  fetchSiteSettings: () => ({ type: "settings/fetch" }),
  updateSiteSettings: (payload) => ({ type: "settings/update", payload }),
}));

describe("Settings", () => {
  beforeEach(() => dispatch.mockClear());
  afterEach(cleanup);

  test("loads existing settings and dispatches validated form values", () => {
    render(<Settings />);
    expect(screen.getByDisplayValue("contact@example.test")).toBeInTheDocument();
    dispatch.mockClear();
    fireEvent.change(screen.getByDisplayValue("contact@example.test"), {
      target: { name: "contact_email", value: "new@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "settings.saveChanges" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "settings/update",
      payload: {
        contact_email: "new@example.test",
        contact_phone: "+243812345678",
        address: "Lubumbashi",
      },
    });
  });
});
