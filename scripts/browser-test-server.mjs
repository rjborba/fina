import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const requireApi = createRequire(join(root, "apps/api/package.json"));
const requireWeb = createRequire(join(root, "apps/web/package.json"));
const { Client } = requireApi("pg");
const { DataSource } = requireApi("typeorm");
const jwt = requireApi("jsonwebtoken");
const webOrigin = "http://127.0.0.1:4180";
const databaseName = `fina_browser_test_${process.pid}_${Date.now()}`;
const signingSecret = randomBytes(32).toString("hex");
const fixtureUser = {
  id: randomUUID(),
  email: "browser-review@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Browser review fixture" },
  created_at: new Date().toISOString(),
};
let administrator;
let database;
let application;
let vite;
let auth;
let createdDatabase = false;
let stopping = false;

async function cleanup() {
  if (stopping) return;
  stopping = true;
  let failed = false;
  const close = async (operation) => {
    try {
      await operation();
    } catch {
      failed = true;
    }
  };
  await close(() => vite?.close());
  await close(() => application?.close());
  if (auth) await close(() => new Promise((resolve) => auth.close(resolve)));
  if (database?.isInitialized) await close(() => database.destroy());
  if (administrator) {
    if (createdDatabase) {
      await close(() =>
        administrator.query(
          "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
          [databaseName],
        ),
      );
      await close(async () => {
        await administrator.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
        console.log("Dropped isolated browser-test database.");
      });
    }
    await close(() => administrator.end());
  }
  if (failed) console.error("An isolated browser-test cleanup step failed.");
  return !failed;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void cleanup().then((success) => process.exit(success ? 0 : 1));
  });
}

async function start() {
  // Never load production configuration. Only the local administrative connection
  // is used, exclusively to create/drop this process's uniquely named database.
  const local = requireApi("dotenv").parse(
    await readFile(join(root, "apps/api/.env.local")),
  );
  const adminUrl = new URL(local.DATABASE_URL);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(adminUrl.hostname) ||
    adminUrl.port !== "54322"
  ) {
    throw new Error(
      "Browser tests require local Supabase PostgreSQL on port 54322.",
    );
  }
  administrator = new Client({ connectionString: adminUrl.toString() });
  await administrator.connect();
  await administrator.query(
    `CREATE DATABASE "${databaseName}" TEMPLATE template0`,
  );
  createdDatabase = true;
  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${databaseName}`;
  database = new DataSource({
    type: "postgres",
    url: testUrl.toString(),
    synchronize: false,
    logging: false,
    migrations: [join(root, "apps/api/dist/database/migrations/*.js")],
  });
  await database.initialize();
  await database.query("CREATE SCHEMA auth");
  await database.query(
    "CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb)",
  );
  await database.query(
    "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid'",
  );
  await database.query(
    "CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS 'SELECT NULL::text'",
  );
  await database.runMigrations({ transaction: "all" });
  await database.query(
    "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
    [
      fixtureUser.id,
      fixtureUser.email,
      JSON.stringify(fixtureUser.user_metadata),
    ],
  );

  // A loopback-only identity fixture exercises the real Supabase client and Nest
  // JWT verification without touching development or production Auth records.
  let authOrigin;
  auth = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", webOrigin);
    response.setHeader(
      "Access-Control-Allow-Headers",
      "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Content-Type", "application/json");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    try {
      const url = new URL(request.url, authOrigin);
      if (url.pathname === "/auth/v1/token" && request.method === "POST") {
        let raw = "";
        for await (const chunk of request) {
          raw += chunk;
          if (raw.length > 4096) throw new Error("Fixture request too large");
        }
        const credentials = JSON.parse(raw);
        if (
          credentials.email !== fixtureUser.email ||
          credentials.password !== "browser-fixture-password"
        ) {
          response
            .writeHead(400)
            .end(JSON.stringify({ error: "Invalid fixture credentials" }));
          return;
        }
        const accessToken = jwt.sign(
          {
            sub: fixtureUser.id,
            email: fixtureUser.email,
            role: "authenticated",
          },
          signingSecret,
          {
            expiresIn: "1h",
            audience: "authenticated",
            issuer: `${authOrigin}/auth/v1`,
          },
        );
        response.end(
          JSON.stringify({
            access_token: accessToken,
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: randomBytes(32).toString("hex"),
            user: fixtureUser,
          }),
        );
        return;
      }
      if (url.pathname === "/auth/v1/user") {
        jwt.verify(
          request.headers.authorization?.replace(/^Bearer /, "") ?? "",
          signingSecret,
          {
            audience: "authenticated",
            issuer: `${authOrigin}/auth/v1`,
            algorithms: ["HS256"],
          },
        );
        response.end(JSON.stringify(fixtureUser));
        return;
      }
      if (url.pathname === "/auth/v1/logout") {
        response.writeHead(204).end();
        return;
      }
      response
        .writeHead(404)
        .end(JSON.stringify({ error: "Fixture route not found" }));
    } catch {
      response
        .writeHead(400)
        .end(JSON.stringify({ error: "Invalid fixture request" }));
    }
  });
  await new Promise((resolve) => auth.listen(0, "127.0.0.1", resolve));
  authOrigin = `http://127.0.0.1:${auth.address().port}`;
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: testUrl.toString(),
    DATABASE_SCHEMA: "public",
    DATABASE_SSL: "false",
    SUPABASE_URL: authOrigin,
    SUPABASE_JWT_SECRET: signingSecret,
    CORS_ORIGINS: webOrigin,
    VITE_SUPABASE_URL: authOrigin,
    VITE_SUPABASE_KEY: "browser-fixture-public-key",
  });
  requireApi("reflect-metadata");
  const { NestFactory } = requireApi("@nestjs/core");
  const { AppModule } = requireApi(join(root, "apps/api/dist/app.module.js"));
  application = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  application.useBodyParser("json", { limit: "32mb" });
  application.set("query parser", "extended");
  application.enableCors({ origin: webOrigin });
  await application.listen(0, "127.0.0.1");
  process.env.VITE_API_URL = await application.getUrl();
  const { createServer: createViteServer } = await import(
    pathToFileURL(requireWeb.resolve("vite")).href
  );
  vite = await createViteServer({
    root: join(root, "apps/web"),
    mode: "test",
    logLevel: "error",
    server: { host: "127.0.0.1", port: 4180, strictPort: true },
  });
  await vite.listen();
  console.log(`Isolated browser-test application ready at ${webOrigin}`);
}

start().catch(async () => {
  // Never echo driver exceptions, connection strings, SQL, or identity payloads.
  console.error(
    "Could not start the isolated browser-test harness. Check local Supabase and run pnpm build:api.",
  );
  await cleanup();
  process.exitCode = 1;
});
