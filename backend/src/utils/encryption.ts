import crypto from "crypto";
import { config } from "../config/index";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const ENCRYPTED_FORMAT = /^[0-9a-f]+:[0-9a-f]{32}:[0-9a-f]+$/i;

function getKey(): Buffer {
  if (!config.fieldEncryptionKey) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not configured — cannot encrypt/decrypt sensitive fields.",
    );
  }
  // Derive a fixed 32-byte key regardless of the raw secret's length/format.
  return crypto.createHash("sha256").update(config.fieldEncryptionKey).digest();
}

/** Encrypts a plaintext string for storage. Format: iv:authTag:ciphertext (all hex). */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value previously produced by encryptField. If the value doesn't
 * match the encrypted format, it's returned as-is — covers legacy plaintext
 * keys stored before encryption was introduced, until they're next re-saved.
 */
export function decryptField(value: string): string {
  if (!ENCRYPTED_FORMAT.test(value)) {
    return value;
  }
  const [ivHex, authTagHex, dataHex] = value.split(":");
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
