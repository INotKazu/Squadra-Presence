import { describe, expect, it } from "vitest";
import {
  decryptCloudText,
  deriveCloudSecrets,
  encryptCloudText,
  formatCloudLinkCode,
  generateCloudLinkCode,
  isValidCloudLinkCode,
} from "./cloudCrypto";

describe("cloud vault encryption", () => {
  it("generates a readable high-entropy device code", () => {
    const code = generateCloudLinkCode();
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{4}(?:-[2-9A-HJ-NP-Z]{4}){5}$/u);
    expect(isValidCloudLinkCode(code)).toBe(true);
    expect(formatCloudLinkCode(code.replaceAll("-", ""))).toBe(code);
  });

  it("derives stable, separated vault secrets", async () => {
    const code = "2345-6789-ABCD-EFGH-JKLM-NPQR";
    const first = await deriveCloudSecrets(code);
    const second = await deriveCloudSecrets(code.toLowerCase());
    expect(first.vaultId).toBe(second.vaultId);
    expect(first.authToken).toBe(second.authToken);
    expect(first.vaultId).not.toBe(first.authToken);
    expect(first.vaultId).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("round-trips plaintext and rejects the wrong link code", async () => {
    const firstCode = "2345-6789-ABCD-EFGH-JKLM-NPQR";
    const otherCode = "RSTU-VWXY-Z234-5678-9ABC-DEFG";
    const encrypted = await encryptCloudText('{"private":"squadra"}', firstCode);
    expect(encrypted.ciphertext).not.toContain("squadra");
    await expect(decryptCloudText(encrypted, firstCode)).resolves.toBe('{"private":"squadra"}');
    await expect(decryptCloudText(encrypted, otherCode)).rejects.toThrow(/decryption failed/i);
  });
});
