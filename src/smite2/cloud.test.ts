import { describe, expect, it } from "vitest";
import { deriveCloudSecrets } from "../lib/cloudCrypto";
import {
  createSmite2CloudPayload,
  decryptSmite2CloudText,
  deriveSmite2CloudSecrets,
  encryptSmite2CloudText,
  parseSmite2CloudPayload,
} from "./cloud";
import { DEFAULT_SMITE2_SETTINGS } from "./storage";

const LINK_CODE = "2345-6789-ABCD-EFGH-JKLM-NPQR";

describe("SMITE 2 cloud boundary", () => {
  it("derives a different vault, auth token, and key from Squadra", async () => {
    const [smite2, squadra] = await Promise.all([
      deriveSmite2CloudSecrets(LINK_CODE),
      deriveCloudSecrets(LINK_CODE),
    ]);
    expect(smite2.vaultId).not.toBe(squadra.vaultId);
    expect(smite2.authToken).not.toBe(squadra.authToken);
    expect(Array.from(smite2.encryptionKey)).not.toEqual(Array.from(squadra.encryptionKey));
  });

  it("encrypts and decrypts a SMITE 2 payload", async () => {
    const payload = createSmite2CloudPayload(DEFAULT_SMITE2_SETTINGS, [], { matches: [] });
    const plaintext = JSON.stringify(payload);
    const envelope = await encryptSmite2CloudText(plaintext, LINK_CODE);
    expect(envelope.ciphertext).not.toContain("kazucorp-smite2");
    const decrypted = await decryptSmite2CloudText(envelope, LINK_CODE);
    expect(parseSmite2CloudPayload(decrypted).format).toBe("kazucorp-smite2-cloud-vault");
  });

  it("rejects Squadra payloads instead of migrating them implicitly", () => {
    expect(() => parseSmite2CloudPayload(JSON.stringify({
      format: "squadra-cloud-vault",
      version: 1,
    }))).toThrow(/not a supported.*SMITE 2/i);
  });
});
