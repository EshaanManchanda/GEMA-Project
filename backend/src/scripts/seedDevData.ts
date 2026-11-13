/**
 * Additive local-dev mock data for modules seed.ts does not cover.
 *
 *   npm run db:seed-dev          # insert/refresh mock rows
 *   npm run db:seed-dev -- --clean   # remove only the mock rows
 *
 * Safe to re-run and never wipes collections: every mock row gets a deterministic
 * _id (mockId), so a re-run deletes and re-inserts exactly those rows and nothing else.
 * Run `npm run db:seed` first - several sections link to its users / events / orders.
 * Refuses non-local databases via seedGuard.
 */
import { assertSafeSeedTarget } from "./seedGuard";
import mongoose from "mongoose";
import { config, connectDB, logger } from "../config/index";
import { sections } from "./seedDevData/index";
import { Ctx } from "./seedDevData/helpers";

const CLEAN = process.argv.includes("--clean");

async function main() {
  assertSafeSeedTarget(config.mongodbUri);
  await connectDB();

  const ctx = await Ctx.load();
  const summary: string[] = [];

  for (const section of sections) {
    for (const { label, model, docs } of await section(ctx)) {
      const ids = docs.map((d) => d._id);
      // ponytail: raw collection delete/insert skips Mongoose hooks (no password hashing, no auto tokens).
      // Fine for mock rows; fields hooks would fill (e.g. unsubscribeToken) are set explicitly.
      await model.deleteMany({ _id: { $in: ids } });
      if (CLEAN) { summary.push(`${label}: removed`); continue; }
      try {
        // insertMany(ordered:false) silently drops invalid docs - surface why.
        const bad = docs.map((d) => new model(d).validateSync()).filter(Boolean);
        const res = await model.insertMany(docs, { ordered: false });
        summary.push(`${label}: ${res.length}/${docs.length}` + (bad.length ? `  !! ${bad.length} invalid, e.g. ${bad[0]!.message.slice(0, 200)}` : ""));
      } catch (err: any) {
        const ok = err.insertedDocs?.length ?? 0;
        const first = err.writeErrors?.[0]?.err?.errmsg || err.message;
        summary.push(`${label}: ${ok}/${docs.length}  !! ${String(first).slice(0, 160)}`);
      }
    }
  }

  logger.info(`seed-dev ${CLEAN ? "(clean)" : ""}\n  ` + summary.join("\n  "));
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
