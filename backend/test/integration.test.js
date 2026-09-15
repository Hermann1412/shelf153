import test, { after, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";

const databaseUrl = process.env.TEST_DATABASE_URL;
const requireDatabase = process.env.REQUIRE_TEST_DATABASE === "true";

if (!databaseUrl) {
  test("integration database is configured", { skip: !requireDatabase }, () => {
    assert.fail("TEST_DATABASE_URL is required for integration tests");
  });
} else {
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET_KEY ||= "integration-test-secret-that-is-long-enough";
  process.env.JWT_EXPIRES_IN ||= "1h";
  process.env.COOKIE_EXPIRES_IN ||= "1";
  process.env.FRONTEND_URL ||= "http://localhost:5173";
  process.env.DASHBOARD_URL ||= "http://localhost:5174";

  const [{ default: request }, { default: jwt }, { default: bcrypt }, appModule, { default: prisma }, paymentService, payoutService, reconciliationService, financialService, refundService] = await Promise.all([
    import("supertest"), import("jsonwebtoken"), import("bcrypt"), import("../app.js"),
    import("../database/db.js"), import("../services/paymentService.js"),
    import("../services/payoutService.js"),
    import("../services/paymentReconciliationService.js"),
    import("../services/financialService.js"),
    import("../services/refundService.js"),
  ]);
  const app = appModule.default;

  const cookieFor = (user) => `token=${jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: "1h" })}`;
  const createUser = async (overrides = {}) => prisma.user.create({
    data: {
      name: overrides.name || "Test User",
      email: overrides.email || `${crypto.randomUUID()}@example.test`,
      password: await bcrypt.hash(overrides.password || "password123", 4),
      role: overrides.role || "User",
    },
  });
  const lineAccounting = (price, quantity) => {
    const values = financialService.calculateLineFinancials({ unitPrice: price, quantity, commissionRate: "0.07" });
    return {
      gross_amount: values.grossAmount,
      commission_rate: values.commissionRate,
      platform_commission: values.commissionAmount,
      seller_net_amount: values.sellerAmount,
    };
  };
  const paymentAccounting = (grossAmount) => {
    const values = financialService.calculateLineFinancials({ unitPrice: grossAmount, quantity: 1, commissionRate: "0.07" });
    return {
      commission_rate: values.commissionRate,
      gross_sales_amount: values.grossAmount,
      gross_commission: values.commissionAmount,
      platform_net_revenue: values.commissionAmount,
      seller_net_amount: values.sellerAmount,
    };
  };

  const clearDatabase = async () => {
    await prisma.sellerDebtRecovery.deleteMany();
    await prisma.sellerDebt.deleteMany();
    await prisma.financialLedgerEntry.deleteMany();
    await prisma.financialAdjustmentAudit.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.review.deleteMany();
    await prisma.saleRefund.deleteMany();
    await prisma.order.deleteMany();
    await prisma.sellerPayout.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.siteSettings.deleteMany();
  };

  before(async () => {
    await prisma.$connect();
  });
  beforeEach(clearDatabase);
  after(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  describe("authentication", () => {
    test("registers a user without leaking credentials", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        name: "Alice", email: "ALICE@example.test", password: "password123",
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.user.email, "alice@example.test");
      assert.equal(response.body.user.password, undefined);
      assert.equal(response.body.user.reset_password_token, undefined);
      assert.equal(response.body.token, undefined);
      assert.match(response.headers["set-cookie"][0], /HttpOnly/);
    });

    test("logs in with normalized email and returns only public fields", async () => {
      await createUser({ email: "login@example.test" });
      const response = await request(app).post("/api/v1/auth/login").send({ email: " LOGIN@example.test ", password: "password123" });
      assert.equal(response.status, 200);
      assert.equal(response.body.user.password, undefined);
    });
  });

  describe("orders and roles", () => {
    test("lists active products through Prisma and rejects invalid cart quantities", async () => {
      const buyer = await createUser({ email: "catalog-buyer@example.test" });
      const admin = await createUser({ email: "catalog-admin@example.test", role: "Admin" });
      const product = await prisma.product.create({
        data: { name: "Laptop", description: "Portable computer", price: 100, category: "Tech", stock: 4, created_by: admin.id },
      });
      const catalog = await request(app).get("/api/v1/product");
      assert.equal(catalog.status, 200);
      assert.equal(catalog.body.products[0].id, product.id);

      const invalidOrder = await request(app).post("/api/v1/order/new").set("Cookie", cookieFor(buyer)).send({
        full_name: "Buyer", state: "HK", city: "Lubumbashi", country: "CD",
        address: "Address", pincode: "0000", phone: "0990000000",
        orderedItems: [{ product: { id: product.id }, quantity: -2 }],
      });
      assert.equal(invalidOrder.status, 400);
      assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 4);
    });

    test("allows only the buyer or an admin to read shipping details", async () => {
      const buyer = await createUser({ email: "buyer@example.test" });
      const stranger = await createUser({ email: "stranger@example.test" });
      const admin = await createUser({ email: "admin@example.test", role: "Admin" });
      const product = await prisma.product.create({ data: { name: "Phone", description: "Phone", price: 10, category: "Tech", stock: 5, created_by: admin.id } });
      const order = await prisma.order.create({
        data: {
          buyer_id: buyer.id, total_price: 13.8, tax_price: 1.8, shipping_price: 2,
          order_items: { create: { product_id: product.id, seller_id: admin.id, quantity: 1, price: 10, title: product.name, ...lineAccounting(10, 1) } },
          shipping_info: { create: { full_name: "Buyer", state: "HK", city: "Lubumbashi", country: "CD", address: "Private", pincode: "0000", phone: "0990000000" } },
          payment: { create: {
            transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", amount: 13.8, currency: "USD", ...paymentAccounting(10),
            provider_payload: { privateProviderField: "must-not-leak" },
          } },
        },
      });
      const ownOrder = await request(app).get(`/api/v1/order/${order.id}`).set("Cookie", cookieFor(buyer));
      assert.equal(ownOrder.status, 200);
      assert.equal(ownOrder.body.orders.payment.provider_payload, undefined);
      assert.equal(ownOrder.body.orders.payment.platform_net_revenue, undefined);
      assert.equal(ownOrder.body.orders.order_items[0].platform_commission, undefined);
      assert.equal((await request(app).get(`/api/v1/order/${order.id}`).set("Cookie", cookieFor(stranger))).status, 403);
      const adminOrder = await request(app).get(`/api/v1/order/${order.id}`).set("Cookie", cookieFor(admin));
      assert.equal(adminOrder.status, 200);
    });

    test("rejects a regular user from admin routes", async () => {
      const user = await createUser();
      const admin = await createUser({ role: "Admin" });
      assert.equal((await request(app).get("/api/v1/admin/getallusers").set("Cookie", cookieFor(user))).status, 403);
      const response = await request(app).get("/api/v1/admin/getallusers").set("Cookie", cookieFor(admin));
      assert.equal(response.status, 200);
      assert.ok(response.body.users.every((entry) => entry.password === undefined));
      const stats = await request(app).get("/api/v1/admin/fetch/dashboard-stats").set("Cookie", cookieFor(admin));
      assert.equal(stats.status, 200);
    });

    test("keeps seller product management isolated by owner", async () => {
      const seller = await createUser({ email: "seller-a@example.test", role: "Seller" });
      const otherSeller = await createUser({ email: "seller-b@example.test", role: "Seller" });
      await Promise.all([
        prisma.sellerProfile.create({ data: { user_id: seller.id, store_name: "A" } }),
        prisma.sellerProfile.create({ data: { user_id: otherSeller.id, store_name: "B" } }),
      ]);
      const product = await prisma.product.create({
        data: { name: "Private", description: "Seller product", price: 5, category: "Test", stock: 2, created_by: seller.id },
      });
      const response = await request(app)
        .put(`/api/v1/product/admin/update/${product.id}`)
        .set("Cookie", cookieFor(otherSeller))
        .send({ name: "Hijacked", description: "No", price: 1000, category: "Test", stock: 1 });
      assert.equal(response.status, 403);
    });

    test("allows only admins to validate and update public site settings", async () => {
      const user = await createUser({ email: "settings-user@example.test" });
      const admin = await createUser({ email: "settings-admin@example.test", role: "Admin" });
      assert.equal((await request(app).patch("/api/v1/settings").set("Cookie", cookieFor(user)).send({ contact_email: "x@example.test" })).status, 403);
      assert.equal((await request(app).patch("/api/v1/settings").set("Cookie", cookieFor(admin)).send({ contact_email: "invalid" })).status, 400);
      const updated = await request(app).patch("/api/v1/settings").set("Cookie", cookieFor(admin)).send({
        contact_email: "contact@example.test", contact_phone: "+243 812 345 678", address: "Lubumbashi",
      });
      assert.equal(updated.status, 200);
      const publicResponse = await request(app).get("/api/v1/settings");
      assert.equal(publicResponse.status, 200);
      assert.equal(publicResponse.body.settings.contact_email, "contact@example.test");
    });

    test("keeps an auditable USD/CDF rate history managed only by admins", async () => {
      const user = await createUser();
      const admin = await createUser({ role: "Admin" });
      const endpoint = "/api/v1/admin/finance/exchange-rates";
      assert.equal((await request(app).post(endpoint).set("Cookie", cookieFor(user)).send({ rate: "2800" })).status, 403);
      assert.equal((await request(app).post(endpoint).set("Cookie", cookieFor(admin)).send({ rate: "2800" })).status, 201);
      const config = await request(app).get("/api/v1/order/payment/config");
      assert.equal(config.body.cdf_exchange_rate, 2800);
      assert.equal(config.body.cdf_exchange_rate_source, "database");
      assert.equal((await request(app).post(endpoint).set("Cookie", cookieFor(admin)).send({ rate: "2900" })).status, 201);
      const rates = await prisma.exchangeRate.findMany({ orderBy: { created_at: "asc" } });
      assert.equal(rates.length, 2);
      assert.equal(rates[0].active, false);
      assert.equal(rates[1].active, true);
    });

    test("keeps customer conversations private while allowing admin support", async () => {
      const customer = await createUser({ email: "chat-customer@example.test" });
      const stranger = await createUser({ email: "chat-stranger@example.test" });
      const admin = await createUser({ email: "chat-admin@example.test", role: "Admin" });
      const conversation = await prisma.conversation.create({ data: { customer_id: customer.id } });
      await prisma.message.create({
        data: { conversation_id: conversation.id, sender_id: customer.id, sender_role: "User", content: "Private message" },
      });
      const path = `/api/v1/chat/conversation/${conversation.id}/messages`;
      assert.equal((await request(app).get(path).set("Cookie", cookieFor(customer))).status, 200);
      assert.equal((await request(app).get(path).set("Cookie", cookieFor(stranger))).status, 403);
      assert.equal((await request(app).get(path).set("Cookie", cookieFor(admin))).status, 200);
    });
  });

  describe("payment transitions", () => {
    test("creates a CDF deposit using the configured rate and stores the conversion", async () => {
      const buyer = await createUser({ email: "cdf-buyer@example.test" });
      const seller = await createUser({ email: "cdf-seller@example.test", role: "Seller" });
      const product = await prisma.product.create({
        data: { name: "CDF item", description: "CDF", price: 10, category: "Test", stock: 2, created_by: seller.id },
      });
      const previousRate = process.env.PAWAPAY_CDF_PER_USD;
      process.env.PAWAPAY_CDF_PER_USD = "2800";
      let providerRequest;
      const { createPlaceNewOrderHandler } = await import("../controllers/orderController.js");
      const handler = createPlaceNewOrderHandler({
        startPayment: async (...args) => {
          providerRequest = args;
          return { success: true, transactionId: args[0] };
        },
      });
      const response = { statusCode: 200, body: null };
      response.status = (code) => { response.statusCode = code; return response; };
      response.json = (body) => { response.body = body; return response; };
      try {
        const configResponse = await request(app).get("/api/v1/order/payment/config");
        assert.equal(configResponse.status, 200);
        assert.equal(configResponse.body.cdf_exchange_rate, 2800);
        assert.ok(configResponse.body.currencies.includes("CDF"));
        await handler({
          user: buyer,
          body: {
            full_name: "CDF Buyer", state: "HK", city: "Lubumbashi", country: "CD",
            address: "Address", pincode: "0000", phone: "243812345678",
            provider: "VODACOM_MPESA_COD", currency: "CDF",
            orderedItems: [{ product: { id: product.id }, quantity: 1 }],
          },
        }, response, (error) => { throw error; });
      } finally {
        if (previousRate === undefined) delete process.env.PAWAPAY_CDF_PER_USD;
        else process.env.PAWAPAY_CDF_PER_USD = previousRate;
      }
      assert.equal(response.statusCode, 201);
      assert.equal(response.body.total_price, 38640);
      assert.equal(response.body.currency, "CDF");
      assert.equal(providerRequest[1], 38640);
      assert.equal(providerRequest[4], "CDF");
      const payment = await prisma.payment.findUnique({ where: { order_id: response.body.orderId } });
      assert.equal(Number(payment.amount), 38640);
      assert.equal(Number(payment.exchange_rate), 2800);
      assert.equal(payment.source_currency, "USD");
    });

    test("applies a successful payment only once", async () => {
      const buyer = await createUser();
      const seller = await createUser({ role: "Seller" });
      const product = await prisma.product.create({ data: { name: "Desk", description: "Desk", price: 20, category: "Home", stock: 8, created_by: seller.id } });
      const order = await prisma.order.create({
        data: {
          buyer_id: buyer.id, total_price: 23.6, tax_price: 3.6, shipping_price: 0, stock_reserved: true,
          order_items: { create: { product_id: product.id, seller_id: seller.id, quantity: 2, price: 20, title: product.name, ...lineAccounting(20, 2) } },
          payment: { create: { transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", amount: 23.6, currency: "USD", ...paymentAccounting(40) } },
        },
      });
      assert.equal((await paymentService.transitionPayment(order.id, "Paid", { status: "COMPLETED" })).changed, true);
      assert.equal((await paymentService.transitionPayment(order.id, "Paid", { status: "COMPLETED" })).changed, false);
      const stored = await prisma.order.findUnique({ where: { id: order.id }, include: { payment: true } });
      assert.equal(stored.payment.payment_status, "Paid");
      assert.equal(stored.payment.accounting_status, "Final");
      assert.ok(stored.paid_at);
      assert.equal(stored.stock_reserved, false);
      assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 8);
    });

    test("releases reserved stock exactly once after failure", async () => {
      const buyer = await createUser();
      const seller = await createUser({ role: "Seller" });
      const product = await prisma.product.create({ data: { name: "Chair", description: "Chair", price: 10, category: "Home", stock: 3, created_by: seller.id } });
      const order = await prisma.order.create({
        data: {
          buyer_id: buyer.id, total_price: 11.8, tax_price: 1.8, shipping_price: 0, stock_reserved: true,
          order_items: { create: { product_id: product.id, seller_id: seller.id, quantity: 2, price: 10, title: product.name, ...lineAccounting(10, 2) } },
          payment: { create: { transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", amount: 11.8, currency: "USD", ...paymentAccounting(20) } },
        },
      });
      await paymentService.transitionPayment(order.id, "Failed", { status: "FAILED" });
      await paymentService.transitionPayment(order.id, "Failed", { status: "FAILED" });
      assert.equal((await prisma.payment.findUnique({ where: { order_id: order.id } })).accounting_status, "Void");
      assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 5);
    });

    test("reconciles an old deposit that pawaPay confirms was never received", async () => {
      const buyer = await createUser();
      const seller = await createUser({ role: "Seller" });
      const product = await prisma.product.create({ data: { name: "Lamp", description: "Lamp", price: 10, category: "Home", stock: 3, created_by: seller.id } });
      const oldDate = new Date(Date.now() - 20 * 60_000);
      const order = await prisma.order.create({
        data: {
          buyer_id: buyer.id, total_price: 11.8, tax_price: 1.8, shipping_price: 0, stock_reserved: true,
          order_items: { create: { product_id: product.id, seller_id: seller.id, quantity: 2, price: 10, title: product.name, ...lineAccounting(10, 2) } },
          payment: { create: { transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", amount: 11.8, currency: "USD", created_at: oldDate, ...paymentAccounting(20) } },
        },
      });
      const results = await reconciliationService.reconcilePendingPayments({
        now: new Date(), getStatus: async () => ({ status: "NOT_FOUND" }),
      });
      assert.deepEqual(results, []);
      assert.equal((await prisma.payment.findUnique({ where: { order_id: order.id } })).payment_status, "Pending");
      await prisma.payment.update({
        where: { order_id: order.id },
        data: { check_attempts: 2, last_checked_at: new Date(Date.now() - 60 * 60_000) },
      });
      const confirmed = await reconciliationService.reconcilePendingPayments({
        now: new Date(), getStatus: async () => ({ status: "NOT_FOUND" }),
      });
      assert.deepEqual(confirmed, [{ orderId: order.id, status: "NOT_FOUND" }]);
      assert.equal((await prisma.payment.findUnique({ where: { order_id: order.id } })).payment_status, "Failed");
      assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 5);
    });

    test("validates and applies repeated pawaPay callbacks idempotently", async () => {
      const buyer = await createUser();
      const seller = await createUser({ role: "Seller" });
      const product = await prisma.product.create({ data: { name: "Table", description: "Table", price: 10, category: "Home", stock: 3, created_by: seller.id } });
      const orderId = crypto.randomUUID();
      const order = await prisma.order.create({
        data: {
          id: orderId,
          buyer_id: buyer.id, total_price: 11.8, tax_price: 1.8, shipping_price: 0, stock_reserved: true,
          order_items: { create: { product_id: product.id, seller_id: seller.id, quantity: 1, price: 10, title: product.name, ...lineAccounting(10, 1) } },
          payment: { create: { transaction_id: orderId, provider: "AIRTEL_COD", amount: 11.8, currency: "USD", ...paymentAccounting(10) } },
        },
      });
      const payload = {
        status: "FOUND",
        data: {
          depositId: order.id, status: "COMPLETED", amount: "11.80", currency: "USD",
          payer: { accountDetails: { provider: "AIRTEL_COD" } },
        },
      };
      const handler = appModule.createPawaPayCallbackHandler({ getStatus: async () => payload });
      const invoke = async (selectedHandler = handler) => {
        const response = { statusCode: 200, body: null };
        response.status = (code) => { response.statusCode = code; return response; };
        response.json = (body) => { response.body = body; return response; };
        await selectedHandler({ body: { depositId: order.id } }, response);
        return response;
      };
      const mismatchHandler = appModule.createPawaPayCallbackHandler({
        getStatus: async () => ({ ...payload, data: { ...payload.data, amount: "99.00" } }),
      });
      assert.equal((await invoke(mismatchHandler)).statusCode, 409);
      assert.equal((await invoke()).body.changed, true);
      assert.equal((await invoke()).body.changed, false);
      assert.equal((await prisma.payment.findUnique({ where: { order_id: order.id } })).payment_status, "Paid");
    });
  });

  describe("seller payouts", () => {
    const createEligibleEarnings = async () => {
      const buyer = await createUser({ email: "payout-buyer@example.test" });
      const seller = await createUser({ email: "payout-seller@example.test", role: "Seller" });
      await prisma.sellerProfile.create({
        data: {
          user_id: seller.id, store_name: "Payout Store", status: "Approved",
          payout_phone: "243812345678", payout_provider: "AIRTEL_COD",
        },
      });
      const product = await prisma.product.create({
        data: { name: "Paid item", description: "Delivered", price: 12.25, category: "Test", stock: 1, created_by: seller.id },
      });
      const order = await prisma.order.create({
        data: {
          buyer_id: buyer.id, total_price: 30.5, tax_price: 4, shipping_price: 2,
          paid_at: new Date(), stock_reserved: false,
          shipping_info: { create: { full_name: "Buyer", state: "HK", city: "Lubumbashi", country: "CD", address: "Test", pincode: "0000", phone: "243812345678" } },
          order_items: {
            create: {
              product_id: product.id, seller_id: seller.id, quantity: 2, price: 12.25,
              title: product.name, item_status: "Delivered", ...lineAccounting(12.25, 2),
            },
          },
          payment: {
            create: {
              transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", amount: 30.5, currency: "USD", ...paymentAccounting(24.5),
              payment_status: "Paid", accounting_status: "Final", processed_at: new Date(),
            },
          },
        },
        include: { order_items: true },
      });
      return { buyer, seller, order, item: order.order_items[0] };
    };

    test("records provider fees and partial/full refunds without charging them again to the seller", async () => {
      const { order, item, seller } = await createEligibleEarnings();
      const admin = await createUser({ email: "fee-admin@example.test", role: "Admin" });
      const feePath = `/api/v1/order/payment/${order.id}/fee`;
      assert.equal((await request(app).patch(feePath).set("Cookie", cookieFor(seller)).send({ fee: "1.00", currency: "USD" })).status, 403);
      const feeResponse = await request(app).patch(feePath).set("Cookie", cookieFor(admin)).send({ fee: "1.00", currency: "USD" });
      assert.equal(feeResponse.status, 200);
      assert.equal(feeResponse.body.changed, true);
      assert.equal(Number(feeResponse.body.payment.payment_fee), 1);
      assert.equal(Number(feeResponse.body.payment.platform_net_revenue), 0.72);
      assert.equal((await paymentService.recordPaymentFee(order.id, "1.00", "USD")).changed, false);
      assert.equal(await prisma.financialAdjustmentAudit.count({ where: { entity_type: "Payment" } }), 1);
      assert.equal(await prisma.financialLedgerEntry.count({ where: { type: "PAYMENT_FEE" } }), 1);

      const refundInput = {
        orderId: order.id,
        orderItemId: item.id,
        externalReference: "refund-partial-1",
        grossAmount: "4.50",
      };
      assert.equal((await paymentService.recordSaleRefund(refundInput)).changed, true);
      assert.equal((await paymentService.recordSaleRefund(refundInput)).changed, false);
      const payment = await prisma.payment.findUnique({ where: { order_id: order.id } });
      const refundedItem = await prisma.orderItem.findUnique({ where: { id: item.id } });
      assert.equal(payment.accounting_status, "PartiallyRefunded");
      assert.equal(Number(payment.refunded_commission), 0.32);
      assert.equal(Number(payment.refunded_seller_amount), 4.18);
      assert.equal(Number(payment.platform_net_revenue), 0.4);
      assert.equal(Number(refundedItem.refunded_seller_amount), 4.18);
      assert.equal(await prisma.saleRefund.count(), 1);

      await paymentService.recordSaleRefund({
        ...refundInput,
        externalReference: "refund-final-2",
        grossAmount: "20.00",
      });
      const fullyRefunded = await prisma.payment.findUnique({ where: { order_id: order.id } });
      assert.equal(fullyRefunded.accounting_status, "Refunded");
      assert.equal(Number(fullyRefunded.refunded_gross_amount), 24.5);
      assert.equal(Number(fullyRefunded.refunded_commission), 1.72);
      assert.equal(Number(fullyRefunded.refunded_seller_amount), 22.78);
      assert.equal(Number(fullyRefunded.platform_net_revenue), -1);
    });

    test("submits a real refund once and applies duplicated callbacks idempotently", async () => {
      const { order, item } = await createEligibleEarnings();
      let initiationCalls = 0;
      const submitted = await refundService.submitRefund({
        orderId: order.id, orderItemId: item.id, externalReference: "pawapay-refund-1", grossAmount: "5.00",
      }, {
        initiate: async (input) => {
          initiationCalls += 1;
          assert.equal(input.depositId, (await prisma.payment.findUnique({ where: { order_id: order.id } })).transaction_id);
          return { success: true, providerResponse: { refundId: input.refundId, status: "ACCEPTED" } };
        },
      });
      assert.equal(submitted.refund.status, "Accepted");
      assert.equal(initiationCalls, 1);
      assert.equal(Number((await prisma.payment.findUnique({ where: { order_id: order.id } })).refunded_gross_amount), 0);
      const providerPayload = {
        status: "FOUND",
        data: {
          refundId: submitted.refund.id, status: "COMPLETED", amount: "5.00", currency: "USD",
          recipient: { accountDetails: { phoneNumber: "243812345678", provider: "AIRTEL_COD" } },
        },
      };
      const handler = appModule.createPawaPayRefundCallbackHandler({ getStatus: async () => providerPayload });
      const invoke = async () => {
        const response = { statusCode: 200, body: null };
        response.status = (code) => { response.statusCode = code; return response; };
        response.json = (body) => { response.body = body; return response; };
        await handler({ body: { refundId: submitted.refund.id } }, response);
        return response;
      };
      assert.equal((await invoke()).body.changed, true);
      assert.equal((await invoke()).body.changed, false);
      assert.equal(Number((await prisma.payment.findUnique({ where: { order_id: order.id } })).refunded_gross_amount), 5);
      assert.equal(await prisma.financialLedgerEntry.count({ where: { idempotency_key: `refund:${submitted.refund.id}:completed` } }), 1);
    });

    test("keeps a timed-out refund pending and resolves it before any retry", async () => {
      const { order, item } = await createEligibleEarnings();
      let initiationCalls = 0;
      const input = { orderId: order.id, orderItemId: item.id, externalReference: "refund-timeout", grossAmount: "3.00" };
      const uncertain = await refundService.submitRefund(input, {
        initiate: async () => { initiationCalls += 1; return { success: false, definitive: false }; },
      });
      assert.equal(uncertain.uncertain, true);
      const completed = await refundService.submitRefund(input, {
        getStatus: async () => ({
          status: "FOUND", data: { refundId: uncertain.refund.id, status: "COMPLETED", amount: "3.00", currency: "USD", recipient: { accountDetails: { phoneNumber: "243812345678", provider: "AIRTEL_COD" } } },
        }),
        initiate: async () => { initiationCalls += 1; throw new Error("must not retry"); },
      });
      assert.equal(completed.refund.status, "Completed");
      assert.equal(initiationCalls, 1);
    });

    test("reconciles a refund when its callback never arrives", async () => {
      const { order, item } = await createEligibleEarnings();
      const { refund } = await refundService.createRefundRequest({
        orderId: order.id, orderItemId: item.id, externalReference: "missing-refund-callback", grossAmount: "2.00",
      });
      await prisma.saleRefund.update({
        where: { id: refund.id },
        data: { created_at: new Date(Date.now() - 10 * 60_000), next_check_at: new Date(Date.now() - 60_000) },
      });
      const results = await reconciliationService.reconcilePendingRefunds({
        now: new Date(),
        getStatus: async () => ({
          status: "FOUND", data: { refundId: refund.id, status: "COMPLETED", amount: "2.00", currency: "USD", recipient: { accountDetails: { phoneNumber: "243812345678", provider: "AIRTEL_COD" } } },
        }),
      });
      assert.deepEqual(results, [{ refundId: refund.id, status: "COMPLETED" }]);
      assert.equal((await prisma.saleRefund.findUnique({ where: { id: refund.id } })).status, "Completed");
    });

    test("uses the historical CDF rate and refunds the full customer charge on the final line refund", async () => {
      const { order, item } = await createEligibleEarnings();
      await prisma.payment.update({
        where: { order_id: order.id }, data: { currency: "CDF", amount: "85400", exchange_rate: "2800" },
      });
      const first = await refundService.createRefundRequest({
        orderId: order.id, orderItemId: item.id, externalReference: "cdf-partial", grossAmount: "4.50",
      });
      assert.equal(Number(first.refund.provider_amount), 12600);
      await refundService.transitionRefund(first.refund.id, "COMPLETED", { status: "COMPLETED" });
      const final = await refundService.createRefundRequest({
        orderId: order.id, orderItemId: item.id, externalReference: "cdf-final", grossAmount: "20.00",
      });
      assert.equal(Number(final.refund.provider_amount), 72800);
      assert.equal(Number(first.refund.provider_amount) + Number(final.refund.provider_amount), 85400);
    });

    test("reserves delivered earnings once and releases them only after failure", async () => {
      const { seller, item } = await createEligibleEarnings();
      const destination = {
        sellerId: seller.id, phone: "243812345678", provider: "AIRTEL_COD", currency: "USD",
      };
      const first = await payoutService.reserveSellerEarnings({ payoutId: crypto.randomUUID(), ...destination });
      assert.equal(Number(first.amount), 22.78);
      await assert.rejects(
        payoutService.reserveSellerEarnings({ payoutId: crypto.randomUUID(), ...destination }),
        (error) => error.statusCode === 409,
      );
      assert.equal((await prisma.orderItem.findUnique({ where: { id: item.id } })).payout_id, first.id);

      assert.equal((await payoutService.transitionSellerPayout(first.id, "Failed", { status: "FAILED" })).changed, true);
      assert.equal((await payoutService.transitionSellerPayout(first.id, "Failed", { status: "FAILED" })).changed, false);
      assert.equal((await prisma.orderItem.findUnique({ where: { id: item.id } })).payout_id, null);
      const retry = await payoutService.reserveSellerEarnings({ payoutId: crypto.randomUUID(), ...destination });
      assert.notEqual(retry.id, first.id);
    });

    test("prevents two concurrent payouts from reserving the same earnings", async () => {
      const { seller } = await createEligibleEarnings();
      const destination = { sellerId: seller.id, phone: "243812345678", provider: "AIRTEL_COD", currency: "USD" };
      const attempts = await Promise.allSettled([
        payoutService.reserveSellerEarnings({ payoutId: crypto.randomUUID(), ...destination }),
        payoutService.reserveSellerEarnings({ payoutId: crypto.randomUUID(), ...destination }),
      ]);
      assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(await prisma.sellerPayout.count(), 1);
    });

    test("allows only one concurrent refund in progress for a deposit", async () => {
      const { order, item } = await createEligibleEarnings();
      const attempts = await Promise.allSettled([
        refundService.createRefundRequest({ orderId: order.id, orderItemId: item.id, externalReference: "concurrent-refund-a", grossAmount: "1.00" }),
        refundService.createRefundRequest({ orderId: order.id, orderItemId: item.id, externalReference: "concurrent-refund-b", grossAmount: "1.00" }),
      ]);
      assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(await prisma.saleRefund.count(), 1);
    });

    test("converts USD earnings to an auditable integer CDF payout", async () => {
      const { seller } = await createEligibleEarnings();
      const payout = await payoutService.reserveSellerEarnings({
        payoutId: crypto.randomUUID(),
        sellerId: seller.id,
        phone: "243812345678",
        provider: "VODACOM_MPESA_COD",
        currency: "CDF",
        exchangeRate: 2800,
      });
      assert.equal(Number(payout.source_amount), 22.78);
      assert.equal(payout.source_currency, "USD");
      assert.equal(Number(payout.exchange_rate), 2800);
      assert.equal(Number(payout.amount), 63784);
      assert.equal(payout.currency, "CDF");
    });

    test("restricts payout history and summary by role and seller ownership", async () => {
      const { seller } = await createEligibleEarnings();
      const stranger = await createUser({ email: "payout-stranger@example.test" });
      const admin = await createUser({ email: "payout-admin@example.test", role: "Admin" });
      const payout = await payoutService.reserveSellerEarnings({
        payoutId: crypto.randomUUID(), sellerId: seller.id, phone: "243812345678",
        provider: "AIRTEL_COD", currency: "USD",
      });
      const own = await request(app).get("/api/v1/payout").set("Cookie", cookieFor(seller));
      assert.equal(own.status, 200);
      assert.deepEqual(own.body.payouts.map((entry) => entry.id), [payout.id]);
      assert.equal(own.body.payouts[0].provider_payload, undefined);
      assert.equal((await request(app).get("/api/v1/payout").set("Cookie", cookieFor(stranger))).status, 403);
      const summary = await request(app).get("/api/v1/payout/summary").set("Cookie", cookieFor(admin));
      assert.equal(summary.status, 200);
      assert.equal(summary.body.summaries[0].eligible_amount, 0);
      assert.equal((await request(app).get("/api/v1/payout/summary").set("Cookie", cookieFor(seller))).status, 403);
    });

    test("validates and applies repeated payout callbacks idempotently", async () => {
      const { seller } = await createEligibleEarnings();
      const payout = await payoutService.reserveSellerEarnings({
        payoutId: crypto.randomUUID(), sellerId: seller.id, phone: "243812345678",
        provider: "AIRTEL_COD", currency: "USD",
      });
      const payload = {
        status: "FOUND",
        data: {
          payoutId: payout.id, status: "COMPLETED", amount: "22.78", currency: "USD",
          recipient: { accountDetails: { phoneNumber: "243812345678", provider: "AIRTEL_COD" } },
        },
      };
      const handler = appModule.createPawaPayPayoutCallbackHandler({ getStatus: async () => payload });
      const invoke = async (selectedHandler = handler) => {
        const response = { statusCode: 200, body: null };
        response.status = (code) => { response.statusCode = code; return response; };
        response.json = (body) => { response.body = body; return response; };
        await selectedHandler({ body: { payoutId: payout.id } }, response);
        return response;
      };
      const mismatch = appModule.createPawaPayPayoutCallbackHandler({
        getStatus: async () => ({ ...payload, data: { ...payload.data, amount: "99.00" } }),
      });
      assert.equal((await invoke(mismatch)).statusCode, 409);
      assert.equal((await invoke()).body.changed, true);
      assert.equal((await invoke()).body.changed, false);
      assert.equal((await prisma.sellerPayout.findUnique({ where: { id: payout.id } })).status, "Completed");
      assert.equal((await payoutService.recordPayoutFee(payout.id, "1.00", "USD", { reason: "statement" })).changed, true);
      assert.equal((await payoutService.recordPayoutFee(payout.id, "1.00", "USD", { reason: "statement" })).changed, false);
      assert.equal(await prisma.financialAdjustmentAudit.count({ where: { entity_type: "SellerPayout" } }), 1);
    });

    test("releases earnings when reconciliation confirms payout was not found", async () => {
      const { seller, item } = await createEligibleEarnings();
      const payout = await payoutService.reserveSellerEarnings({
        payoutId: crypto.randomUUID(), sellerId: seller.id, phone: "243812345678",
        provider: "AIRTEL_COD", currency: "USD",
      });
      await prisma.sellerPayout.update({
        where: { id: payout.id }, data: { created_at: new Date(Date.now() - 20 * 60_000) },
      });
      const results = await reconciliationService.reconcilePendingPayouts({
        now: new Date(), getStatus: async () => ({ status: "NOT_FOUND" }),
      });
      assert.deepEqual(results, []);
      await prisma.sellerPayout.update({
        where: { id: payout.id }, data: { check_attempts: 2, last_checked_at: new Date(Date.now() - 60 * 60_000) },
      });
      const confirmed = await reconciliationService.reconcilePendingPayouts({
        now: new Date(), getStatus: async () => ({ status: "NOT_FOUND" }),
      });
      assert.deepEqual(confirmed, [{ payoutId: payout.id, status: "NOT_FOUND" }]);
      assert.equal((await prisma.sellerPayout.findUnique({ where: { id: payout.id } })).status, "Failed");
      assert.equal((await prisma.orderItem.findUnique({ where: { id: item.id } })).payout_id, null);
    });

    test("creates seller debt for a refund after payout and recovers it from future earnings", async () => {
      const { seller, order, item } = await createEligibleEarnings();
      const destination = { sellerId: seller.id, phone: "243812345678", provider: "AIRTEL_COD", currency: "USD" };
      const paidPayout = await payoutService.reserveSellerEarnings({ payoutId: crypto.randomUUID(), ...destination });
      await payoutService.transitionSellerPayout(paidPayout.id, "Completed", { status: "COMPLETED" });
      const created = await refundService.createRefundRequest({
        orderId: order.id, orderItemId: item.id, externalReference: "post-payout-refund",
        grossAmount: "10.00",
      });
      await refundService.transitionRefund(created.refund.id, "COMPLETED", {
        status: "FOUND", data: { refundId: created.refund.id, status: "COMPLETED" },
      });
      const debt = await prisma.sellerDebt.findUnique({ where: { refund_id: created.refund.id } });
      assert.equal(Number(debt.original_amount), 9.3);
      assert.equal(Number(debt.remaining_amount), 9.3);

      const buyer = await createUser();
      const product = await prisma.product.create({ data: { name: "Future sale", description: "Future", price: 20, category: "Test", stock: 1, created_by: seller.id } });
      await prisma.order.create({
        data: {
          buyer_id: buyer.id, total_price: 23.6, tax_price: 3.6, shipping_price: 0, paid_at: new Date(), stock_reserved: false,
          order_items: { create: { product_id: product.id, seller_id: seller.id, quantity: 1, price: 20, title: product.name, item_status: "Delivered", ...lineAccounting(20, 1) } },
          payment: { create: { transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", amount: 23.6, currency: "USD", payment_status: "Paid", accounting_status: "Final", ...paymentAccounting(20) } },
        },
      });
      const next = await payoutService.reserveSellerEarnings({ payoutId: crypto.randomUUID(), ...destination });
      assert.equal(Number(next.seller_earnings_amount), 18.6);
      assert.equal(Number(next.debt_recovered_amount), 9.3);
      assert.equal(Number(next.source_amount), 9.3);
      await payoutService.transitionSellerPayout(next.id, "Completed", { status: "COMPLETED" });
      assert.equal(Number((await prisma.sellerDebt.findUnique({ where: { id: debt.id } })).remaining_amount), 0);
      assert.equal(await prisma.financialLedgerEntry.count({ where: { type: "DEBT_RECOVERY" } }), 1);
    });
  });
}
