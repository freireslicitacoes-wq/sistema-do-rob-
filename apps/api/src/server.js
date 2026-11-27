import { createServer } from "node:http";

export function createAppServer({ env = process.env } = {}) {
  const serviceName = env.SERVICE_NAME || "tiktok-auto-publisher-api";

  return createServer((request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("x-content-type-options", "nosniff");

    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200);
      response.end(JSON.stringify({
        status: "ok",
        service: serviceName,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    response.writeHead(404);
    response.end(JSON.stringify({
      error: "not_found",
      message: "Rota não encontrada."
    }));
  });
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT deve ser um número entre 1 e 65535.");
  }

  createAppServer().listen(port, "0.0.0.0", () => {
    console.log(`API disponível na porta ${port}`);
  });
}
