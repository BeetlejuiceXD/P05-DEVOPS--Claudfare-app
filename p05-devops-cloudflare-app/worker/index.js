export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/database" || url.pathname === "/api/users") {
      const headers = { "Cache-Control": "no-store" };
      if (request.method !== "GET") {
        return Response.json({ error: "Method not allowed" }, {
          status: 405, headers: { ...headers, Allow: "GET" },
        });
      }

      const db = env["practica-6"];
      if (!db) {
        return Response.json({ error: "D1 binding is not configured" }, {
          status: 503, headers,
        });
      }

      try {
        if (url.pathname === "/api/users") {
          const { results } = await db.prepare("SELECT * FROM users LIMIT 50").all();
          return Response.json({ users: results }, { headers });
        }
        const result = await db.prepare("SELECT 1 AS connected").first();
        if (result?.connected !== 1) {
          throw new Error("Unexpected D1 connection check result");
        }
        return Response.json({ connected: true }, { headers });
      } catch (error) {
        console.error("D1 query failed:", error);
        return Response.json({ error: "Unable to query D1" }, {
          status: 503, headers,
        });
      }
    }

    if (url.pathname === "/api/") {
      return Response.json({ name: "Cloudflare" });
    }

    return new Response(null, { status: 404 });
  },
}
