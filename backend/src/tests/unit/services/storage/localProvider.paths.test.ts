/**
 * LocalProvider joins a caller-supplied folder / relative path onto the upload directory.
 * Nothing may resolve outside it (N90: the media upload passed req.body.folder straight in).
 */
import fs from "fs";
import os from "os";
import path from "path";
import { LocalProvider } from "../../../../services/storage/LocalProvider";

let root: string;
let uploads: string;
let provider: LocalProvider;
const file = (name = "a.png") =>
  ({ originalname: name, buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), mimetype: "image/png", size: 4 }) as Express.Multer.File;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "lp-"));
  uploads = path.join(root, "uploads");
  provider = new LocalProvider(uploads, "http://x/uploads");
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const filesOutsideUploads = () =>
  fs.readdirSync(root, { recursive: true } as any).filter((p: any) => !String(p).startsWith("uploads"));

describe("LocalProvider path containment", () => {
  it("stores a file in a normal folder", async () => {
    const r = await provider.upload(file(), { folder: "events" });
    expect(r.url).toMatch(/^http:\/\/x\/uploads\/events\//);
  });

  it.each(["../escape", "../../escape", "events/../../escape", path.join(os.tmpdir(), "abs-escape")])(
    "refuses folder %p and writes nothing outside the upload directory",
    async (folder) => {
      // upload() reports failure as { success: false } (media.service turns it into an error)
      const r = await provider.upload(file(), { folder }).catch(() => ({ success: false }));
      expect(r.success).toBe(false);
      expect(filesOutsideUploads()).toEqual([]);
    },
  );

  it("refuses to delete, read or list outside the upload directory", async () => {
    fs.writeFileSync(path.join(root, "secret.txt"), "s");
    expect(await provider.delete("../secret.txt")).toBe(false);
    expect(fs.existsSync(path.join(root, "secret.txt"))).toBe(true);
    expect(await provider.exists("../secret.txt")).toBe(false);
    await expect(provider.listFiles("..")).resolves.toEqual([]);
  });
});
