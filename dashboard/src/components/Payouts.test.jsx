// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Payouts from "./Payouts";

const dispatch = vi.fn();
const state = {
  auth: { user: { id: "seller-id", role: "Seller" } },
  payout: {
    loading: false,
    payingSellerId: null,
    summaries: [],
    payouts: [{
      id: "payout-id",
      amount: "24.50",
      currency: "USD",
      provider: "AIRTEL_COD",
      status: "Completed",
      created_at: "2026-09-15T00:00:00.000Z",
      seller: { name: "Seller", seller_profile: { store_name: "My Store" } },
    }],
  },
};

vi.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  useSelector: (selector) => selector(state),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../store/slices/payoutSlice", () => ({
  fetchPayouts: () => ({ type: "payout/fetch" }),
  fetchPayoutSummary: () => ({ type: "payout/summary" }),
  initiateSellerPayout: Object.assign(
    ({ sellerId, currency }) => ({ type: "payout/initiate", sellerId, currency }),
    { fulfilled: { match: () => false } },
  ),
}));

describe("Payouts", () => {
  beforeEach(() => dispatch.mockClear());
  afterEach(cleanup);

  test("shows a seller only their payout history without admin actions", () => {
    render(<Payouts />);
    expect(dispatch).toHaveBeenCalledWith({ type: "payout/fetch" });
    expect(dispatch).not.toHaveBeenCalledWith({ type: "payout/summary" });
    expect(screen.getByText("My Store")).toBeInTheDocument();
    expect(screen.getByText("USD 24.50")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "payouts.pay" })).not.toBeInTheDocument();
  });
});
