const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../app");

describe("SmartDesk Full-Stack API Suite", () => {
  let adminToken = "";
  let userToken = "";
  let createdTicketId = null;
  const testEmail = `tester_${Date.now()}@example.com`;

  test("GET /api/health should return ok status", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
  });

  test("POST /api/auth/login should authenticate default admin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@smartdesk.com", password: "Admin@123" });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, "admin");
    adminToken = res.body.token;
  });

  test("POST /api/auth/register should create a regular user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test Engineer",
        email: testEmail,
        password: "Password123"
      });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, "user");
    userToken = res.body.token;
  });

  test("PUT /api/auth/profile should update user profile name", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        name: "Updated Engineer",
        email: testEmail
      });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, "Updated Engineer");
    userToken = res.body.token;
  });

  test("PUT /api/auth/change-password should securely change password", async () => {
    const res = await request(app)
      .put("/api/auth/change-password")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        currentPassword: "Password123",
        newPassword: "NewSecretPassword123"
      });
    assert.equal(res.status, 200);
    assert.match(res.body.message, /Password updated/i);
  });

  test("POST /api/requests should create a new support ticket", async () => {
    const res = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        subject: "Cannot access API dashboard",
        description: "API keys are rejecting calls with 401 Unauthorized status.",
        category: "Technical Issue",
        priority: "High"
      });
    assert.equal(res.status, 201);
    assert.ok(res.body.request.id);
    assert.equal(res.body.request.status, "Open");
    createdTicketId = res.body.request.id;
  });

  test("GET /api/requests should return paginated tickets", async () => {
    const res = await request(app)
      .get("/api/requests?page=1&limit=5&category=Technical%20Issue")
      .set("Authorization", `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.requests));
    assert.ok(res.body.pagination);
    assert.equal(res.body.pagination.page, 1);
  });

  test("POST /api/requests/:id/comments should add a public comment", async () => {
    const res = await request(app)
      .post(`/api/requests/${createdTicketId}/comments`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        body: "I attempted regenerating the API key twice, but it still fails.",
        is_internal: false
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.comment.is_internal, 0);
  });

  test("POST /api/requests/:id/comments by admin can add internal note", async () => {
    const res = await request(app)
      .post(`/api/requests/${createdTicketId}/comments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        body: "Backend rate-limiter table needs cache flush for this user tenant.",
        is_internal: true
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.comment.is_internal, 1);
  });

  test("GET /api/requests/:id/comments regular user cannot see internal note", async () => {
    const res = await request(app)
      .get(`/api/requests/${createdTicketId}/comments`)
      .set("Authorization", `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    const comments = res.body.comments;
    const hasInternal = comments.some((c) => c.is_internal === 1);
    assert.equal(hasInternal, false, "Regular user must not see internal notes");
  });

  test("GET /api/requests/:id/comments admin can see internal note", async () => {
    const res = await request(app)
      .get(`/api/requests/${createdTicketId}/comments`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    const comments = res.body.comments;
    const hasInternal = comments.some((c) => c.is_internal === 1);
    assert.equal(hasInternal, true, "Admin should see internal notes");
  });

  test("POST /api/requests/:id/ai-suggest generates response suggestions", async () => {
    const res = await request(app)
      .post(`/api/requests/${createdTicketId}/ai-suggest`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.ai_summary);
    assert.ok(res.body.ai_suggestions);
  });

  test("PATCH /api/requests/:id/status regular user is rejected (RBAC)", async () => {
    const res = await request(app)
      .patch(`/api/requests/${createdTicketId}/status`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ status: "Resolved" });
    assert.equal(res.status, 403);
  });

  test("PATCH /api/requests/:id/status admin can update status", async () => {
    const res = await request(app)
      .patch(`/api/requests/${createdTicketId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "In Progress" });
    assert.equal(res.status, 200);
    assert.equal(res.body.request.status, "In Progress");
  });
});
