import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { createServer } from "http";
import net from "net";
import { Socket } from "net";
import { initRealtime } from "./services/realtime.service";

const PORT = Number(process.env.PORT || 5000);
const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS || 15000);

async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", (err: any) => {
        if (err.code === "EADDRINUSE") return resolve(false);
        return resolve(false);
      })
      .once("listening", () => {
        tester.close();
        return resolve(true);
      })
      .listen(port);
  });
}

(async () => {
  const free = await isPortFree(PORT);
  if (!free) {
    console.error(`\n❌ Port ${PORT} is already in use. Server will not start.\n- To free the port: run \n  npx kill-port ${PORT}\n  or change PORT in your environment.\n`);
    // Do not attempt to force-kill here — leave control to the developer / environment.
    process.exit(1);
  }

  const server = createServer(app);
  initRealtime(server);

  // Timeout Configuration
  const keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 65000);
  const headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS || 66000);
  const requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 30000);

  server.keepAliveTimeout = keepAliveTimeout;
  server.headersTimeout = headersTimeout;
  server.requestTimeout = requestTimeout;

  /**
   * SECURITY: Handle client errors and timeouts
   * Logs timeout attempts to detect potential DDoS attacks
   */
  server.on('clientError', (err: any, socket) => {
    if (err.code === 'ECONNRESET' || !socket.writable) {
      console.warn('⚠️ Client connection reset:', {
        code: err.code,
        message: err.message,
      });
      return;
    }

    if (err.code === 'ETIMEDOUT' || err.code === 'EHOSTUNREACH') {
      console.warn('⚠️ Request timeout detected:', {
        code: err.code,
        message: err.message,
        timeout: requestTimeout,
        remoteAddress: (socket as Socket).remoteAddress,
      });
      if (socket.writable) {
        socket.end('HTTP/1.1 408 Request Timeout\r\n\r\n');
      }
      return;
    }

    // For other errors, send 400 Bad Request
    console.warn('⚠️ Client error:', {
      code: err.code,
      message: err.message,
    });
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });

  console.log(`\n⏱️  Timeout Configuration:`, {
    keepAlive: `${keepAliveTimeout}ms`,
    headers: `${headersTimeout}ms`,
    request: `${requestTimeout}ms`,
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    const forceCloseTimer = setTimeout(() => {
      console.error("Graceful shutdown timed out. Forcing exit.");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);

    server.close((error) => {
      clearTimeout(forceCloseTimer);

      if (error) {
        console.error("Error while closing server:", error);
        process.exit(1);
      }

      console.log("Server closed gracefully.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    shutdown("SIGTERM");
  });

  server.listen(PORT, () => {
    console.log(`🚀 Server started on http://localhost:${PORT}`);
  }).on("error", (e: any) => {
    if (e.code === "EADDRINUSE") {
      console.error(`Port ${PORT} already in use (EADDRINUSE).`);
    } else {
      console.error("Server error:", e);
    }
    process.exit(1);
  });
})();
