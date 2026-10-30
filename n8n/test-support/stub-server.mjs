/**
 * stub-server: خادم HTTP محلي صغير يردّ بنفس fixtures الاختبار، لتجربة مسارات ملف `stub`
 * (المضيفون كلّهم إلى http://127.0.0.1:PORT/stub/<host>) على n8n حقيقي بلا إنترنت ولا مفاتيح.
 *
 *   node n8n/test-support/stub-server.mjs [port]      (الافتراضي 8787)
 *
 * يخدم فقط ما في fixtures. لا يرسل شيئًا إلى الخارج ولا يقرأ بيئة.
 */
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { FIXTURES, routeFor } from "./fixtures.js";

export function createStubServer() {
  return createServer((req, res) => {
    const url = req.url || "/";
    if (!url.startsWith("/stub/")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end('{"error":"not_found"}');
      return;
    }
    const target = routeFor("http://127.0.0.1:8787" + url);
    const body = FIXTURES[target];
    if (body === undefined) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end('{"error":"unknown_stub"}');
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] || 8787);
  createStubServer().listen(port, "127.0.0.1", () => {
    console.log("stub-server على http://127.0.0.1:" + port + "/stub/");
  });
}
