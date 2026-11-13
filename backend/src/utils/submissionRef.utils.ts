import { Model } from "mongoose";

/**
 * Competition entry refs are "<PREFIX>-" + the last 8 hex chars of the _id
 * (the `submissionRef` virtual on each submission model). Resolves a ref across
 * EVERY entry, not just the newest N.
 *
 * Those 8 chars are not guaranteed unique (two server processes can mint the
 * same tail), so all matches are fetched and the one owned by `parentEmail` wins.
 * An entry that isn't theirs is indistinguishable from "no such ref" to the caller.
 *
 * ponytail: scans the collection ($expr can't use an index); store an indexed
 * ref on the document if a competition ever reaches ~100k entries.
 */
export async function findBySubmissionRef(
  model: Model<any>,
  prefix: string,
  ref: unknown,
  parentEmail: string,
) {
  const suffix = String(ref ?? "")
    .trim()
    .toLowerCase()
    .replace(new RegExp(`^${prefix}-`, "i"), "")
    .trim();
  if (!/^[0-9a-f]{8}$/.test(suffix)) return null;

  const email = String(parentEmail ?? "").trim().toLowerCase();
  const matches = await model
    .find({
      $expr: { $eq: [{ $substrCP: [{ $toString: "$_id" }, 16, 8] }, suffix] },
    })
    .sort({ createdAt: -1 })
    .limit(10);

  return (
    matches.find(
      (m: any) => String(m.participant?.parentEmail ?? "").toLowerCase() === email,
    ) ?? null
  );
}
