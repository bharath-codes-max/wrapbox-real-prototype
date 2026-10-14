// Generates a new gate password + session secret and writes them to a git-ignored
// local file. Nothing is printed. Put the two WRAPBOX_GATE_* values into Vercel
// (Project → Settings → Environment Variables), then redeploy.
import { randomBytes, randomInt, scryptSync } from "node:crypto";
import { writeFileSync } from "node:fs";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // no look-alikes
const password = Array.from({ length: 24 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""); // ≈139 bits
const salt = randomBytes(16);
const hash = scryptSync(password.normalize("NFKC"), salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
const out = [
  "# Wrapbox preview gate — KEEP PRIVATE. Git-ignored. Generated " + new Date().toISOString(),
  `PASSWORD=${password}`,
  `WRAPBOX_GATE_HASH=s1$${salt.toString("base64")}$${hash.toString("base64")}`,
  `WRAPBOX_GATE_SECRET=${randomBytes(48).toString("base64url")}`,
  "",
].join("\n");
writeFileSync(".gate-credentials.local", out, { mode: 0o600 });
console.log("Wrote .gate-credentials.local (mode 600). Values not printed.");
