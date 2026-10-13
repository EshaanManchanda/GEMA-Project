import { isSafeSeedTarget } from "../../../scripts/seedGuard";

describe("isSafeSeedTarget", () => {
  it.each([
    ["mongodb://localhost:27017/kidrove", "development", undefined, true],
    ["mongodb://127.0.0.1/kidrove", undefined, undefined, true],
    ["mongodb://mongo:27017/kidrove", "development", undefined, true],
    ["mongodb://user:pass@localhost:27017/kidrove", "development", undefined, true],
    ["mongodb+srv://u:p@cluster0.abc.mongodb.net/kidrove", "development", undefined, false],
    ["mongodb://mongo-prod:27017/kidrove", "development", undefined, false],
    ["mongodb://localhost.evil.com/kidrove", "development", undefined, false],
    ["mongodb://localhost:27017/kidrove", "production", undefined, false],
    ["", "development", undefined, false],
    [undefined, "development", undefined, false],
    ["mongodb+srv://u:p@cluster0.abc.mongodb.net/kidrove", "production", "yes", true],
    ["mongodb+srv://u:p@cluster0.abc.mongodb.net/kidrove", "development", "true", false],
  ])("%p (NODE_ENV=%p, flag=%p) → %p", (uri, env, flag, expected) => {
    expect(isSafeSeedTarget(uri, env, flag)).toBe(expected);
  });
});
