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

  const [{ default: request }, { default: jwt }, { default: bcrypt }, { default: app }, { default: prisma }, paymentService] = await Promise.all([
    import("supertest"), import("jsonwebtoken"), import("bcrypt"), import("../app.js"),
    import("../database/db.js"), import("../services/paymentService.js"),
  ]);

  const cookieFor = (user) => `token=${jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: "1h" })}`;
  const createUser = async (overrides = {}) => prisma.user.create({
    data: {
      name: overrides.name || "Test User",
      email: overrides.email || `${crypto.randomUUID()}@example.test`,
      password: await bcrypt.hash(overrides.password || "password123", 4),
      role: overrides.role || "User",
    },
  });

  const clearDatabase = async () => {
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.review.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.user.deleteMany();
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
          order_items: { create: { product_id: product.id, seller_id: admin.id, quantity: 1, price: 10, title: product.name } },
          shipping_info: { create: { full_name: "Buyer", state: "HK", city: "Lubumbashi", country: "CD", address: "Private", pincode: "0000", phone: "0990000000" } },
          payment: { create: { transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", currency: "USD" } },
        },
      });
      assert.equal((await request(app).get(`/api/v1/order/${order.id}`).set("Cookie", cookieFor(buyer))).status, 200);
      assert.equal((await request(app).get(`/api/v1/order/${order.id}`).set("Cookie", cookieFor(stranger))).status, 403);
      assert.equal((await request(app).get(`/api/v1/order/${order.id}`).set("Cookie", cookieFor(admin))).status, 200);
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
  });

  describe("payment transitions", () => {
    test("applies a successful payment only once", async () => {
      const buyer = await createUser();
      const seller = await createUser({ role: "Seller" });
      const product = await prisma.product.create({ data: { name: "Desk", description: "Desk", price: 20, category: "Home", stock: 8, created_by: seller.id } });
      const order = await prisma.order.create({
        data: {
          buyer_id: buyer.id, total_price: 23.6, tax_price: 3.6, shipping_price: 0, stock_reserved: true,
          order_items: { create: { product_id: product.id, seller_id: seller.id, quantity: 2, price: 20, title: product.name } },
          payment: { create: { transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", currency: "USD" } },
        },
      });
      assert.equal((await paymentService.transitionPayment(order.id, "Paid", { status: "COMPLETED" })).changed, true);
      assert.equal((await paymentService.transitionPayment(order.id, "Paid", { status: "COMPLETED" })).changed, false);
      const stored = await prisma.order.findUnique({ where: { id: order.id }, include: { payment: true } });
      assert.equal(stored.payment.payment_status, "Paid");
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
          order_items: { create: { product_id: product.id, seller_id: seller.id, quantity: 2, price: 10, title: product.name } },
          payment: { create: { transaction_id: crypto.randomUUID(), provider: "AIRTEL_COD", currency: "USD" } },
        },
      });
      await paymentService.transitionPayment(order.id, "Failed", { status: "FAILED" });
      await paymentService.transitionPayment(order.id, "Failed", { status: "FAILED" });
      assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 5);
    });
  });
}
