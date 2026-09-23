import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";
import { canUseNativeModules, nodeRequire } from "@/lib/node-only";
import { hasFileSystem } from "@/lib/runtime";

export const GUEST_USER_ID = "guest";
export const GUEST_START_CREDITS = 3000;

/**
 * 로컬은 better-sqlite3, Cloudflare 는 D1 을 쓴다.
 * 두 드라이버의 API 는 같은 모양이지만 D1 은 비동기다 — 모든 호출부는 `await` 를 붙여
 * 동기 드라이버(값을 그대로 반환)와 비동기 드라이버 양쪽에서 동작하게 되어 있다.
 */
type AnyDb = ReturnType<typeof makeSqlite> | ReturnType<typeof makeD1>;
export type Db = AnyDb;

const g = globalThis as unknown as { __c2v_db?: AnyDb };

function makeD1(binding: D1Database) {
  return drizzleD1(binding, { schema });
}

function makeSqlite() {
  const fs = nodeRequire<typeof import("node:fs")>("node:fs");
  const path = nodeRequire<typeof import("node:path")>("node:path");
  const Database = nodeRequire<typeof import("better-sqlite3")>("better-sqlite3");
  const { drizzle } = nodeRequire<typeof import("drizzle-orm/better-sqlite3")>("drizzle-orm/better-sqlite3");
  const { migrate } = nodeRequire<typeof import("drizzle-orm/better-sqlite3/migrator")>("drizzle-orm/better-sqlite3/migrator");
  const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "./data/click2video.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}

/** Cloudflare 런타임이면 D1 바인딩을 돌려준다 (없으면 undefined). */
function d1Binding(): D1Database | undefined {
  try {
    return (getCloudflareContext().env as unknown as { DB?: D1Database }).DB;
  } catch {
    return undefined;
  }
}

export function getDb() {
  if (g.__c2v_db) return g.__c2v_db;
  const binding = d1Binding();
  if (binding) {
    g.__c2v_db = makeD1(binding);
  } else if (hasFileSystem() && canUseNativeModules()) {
    const db = makeSqlite();
    seedSqlite(db);
    g.__c2v_db = db;
  } else {
    throw new Error("데이터베이스를 찾을 수 없습니다 (D1 바인딩도 로컬 파일도 없음).");
  }
  return g.__c2v_db;
}

function seedSqlite(db: ReturnType<typeof makeSqlite>) {
  const existing = db.select().from(schema.users).where(eq(schema.users.id, GUEST_USER_ID)).get();
  if (!existing) {
    db.insert(schema.users).values({ id: GUEST_USER_ID, credits: GUEST_START_CREDITS, createdAt: Date.now() }).run();
  }
}

/**
 * 이 사용자의 행이 있는지 확인하고 없으면 만든다.
 * D1 에서는 마이그레이션이 배포 때 적용되므로 행 생성만 요청 시 한다.
 * (BYOK 공개 배포에서는 방문자마다 서명된 uid 가 하나씩 생긴다.)
 */
export async function ensureUser(id: string = GUEST_USER_ID) {
  const db = getDb();
  const existing = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  if (!existing) {
    await db.insert(schema.users).values({ id, credits: GUEST_START_CREDITS, createdAt: Date.now() }).run();
  }
}

/** @deprecated 소유자별 행을 쓰는 ensureUser(uid) 로 옮겨가는 중. 러너·크론 등 사용자 없는 경로만 쓴다. */
export async function ensureGuest() {
  await ensureUser(GUEST_USER_ID);
}

export { schema };
