import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { api } from "../src/api.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return calls;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("GET trả về dữ liệu JSON và dùng đúng URL", async () => {
  const calls = mockFetch(() => jsonResponse([{ class_id: "WEB-01" }]));

  const data = await api("/sections");

  assert.deepEqual(data, [{ class_id: "WEB-01" }]);
  assert.equal(calls[0].url, "http://127.0.0.1:8000/sections");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
});

test("POST gửi body JSON và header Content-Type", async () => {
  const calls = mockFetch(() => jsonResponse({ ok: true }, 201));

  await api("/enrollments", {
    method: "POST",
    body: { student_id: "22000004", class_section_id: "WEB-01" },
  });

  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    student_id: "22000004",
    class_section_id: "WEB-01",
  });
});

test("204 trả về null, không đọc JSON", async () => {
  mockFetch(() => new Response(null, { status: 204 }));

  const data = await api("/enrollments/22000004/WEB-01", { method: "DELETE" });

  assert.equal(data, null);
});

test("lỗi HTTP với detail dạng chuỗi", async () => {
  mockFetch(() => jsonResponse({ detail: "Lớp đã hết chỗ." }, 409));

  await assert.rejects(
    () => api("/enrollments", { method: "POST", body: {} }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.message, "HTTP 409: Lớp đã hết chỗ.");
      return true;
    },
  );
});

test("lỗi HTTP với detail dạng mảng (422) được nối bằng dấu chấm phẩy", async () => {
  mockFetch(() =>
    jsonResponse({ detail: [{ msg: "field required" }, { msg: "invalid" }] }, 422),
  );

  await assert.rejects(
    () => api("/enrollments", { method: "POST", body: {} }),
    (error) => {
      assert.equal(error.status, 422);
      assert.equal(error.message, "HTTP 422: field required; invalid");
      return true;
    },
  );
});

test("lỗi HTTP không có detail dùng thông báo mặc định", async () => {
  mockFetch(() => jsonResponse({}, 500));

  await assert.rejects(() => api("/sections"), {
    message: "HTTP 500: Yêu cầu không thành công.",
  });
});

test("phản hồi không phải JSON báo lỗi rõ ràng", async () => {
  mockFetch(() => new Response("<html>Bad Gateway</html>", { status: 502 }));

  await assert.rejects(() => api("/sections"), {
    message: "HTTP 502: phản hồi không phải JSON.",
  });
});

test("lỗi mạng trả về thông báo tiếng Việt", async () => {
  mockFetch(() => {
    throw new TypeError("fetch failed");
  });

  await assert.rejects(() => api("/sections"), (error) => {
    assert.match(error.message, /Không nhận được phản hồi API/);
    return true;
  });
});

test("AbortError được ném lại nguyên vẹn", async () => {
  mockFetch(() => {
    const error = new Error("aborted");
    error.name = "AbortError";
    throw error;
  });

  await assert.rejects(() => api("/sections"), { name: "AbortError" });
});