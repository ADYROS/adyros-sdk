// Check an ERC-8004 agent before paying it. Usage: node examples/check-before-pay.mjs base:1
import { Adyros, AdyrosError } from "adyros";

const agent = process.argv[2] ?? "base:1";

try {
  const report = await Adyros.check(agent); // free Quick Check (daily limit applies)
  console.log(`${agent}: score ${report.score}/100, grade ${report.grade}`);
  for (const flag of report.flags ?? []) console.log(`  ${flag.level}: ${flag.text}`);

  if (report.grade !== "strong") {
    console.log("Not paying: trust is not strong enough.");
    process.exitCode = 1;
  } else {
    console.log("OK to pay this agent.");
  }
} catch (e) {
  if (!(e instanceof AdyrosError)) throw e;
  console.error(`Check failed (${e.status}): ${e.message}`);
  process.exitCode = 1;
}
