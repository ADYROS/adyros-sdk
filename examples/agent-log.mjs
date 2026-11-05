// Runs inside an Adyros machine, where ADYROS_API_URL and ADYROS_TOKEN are already set.
import { Adyros, AdyrosError } from "adyros";

const ady = Adyros.fromEnv();

// Every action goes on the machine's public, hash-chained log. Never log secrets.
await ady.log("task.start", "Rebalance stablecoin position", { target: "50/50 USDC/USDT" });

const wallet = await ady.wallet.get();
console.log(`wallet ${wallet.address}, spent today $${wallet.spentToday} of $${wallet.policy.daily_limit_usd}`);

try {
  // Checked against the owner's policy and simulated before it is signed.
  const tx = await ady.wallet.send({ to: "0x0000000000000000000000000000000000000000", value: "0", note: "example transfer" });
  await ady.log("wallet.send", "Sent example transfer", { tx: tx.transactionHash });
} catch (e) {
  if (!(e instanceof AdyrosError && e.status === 403)) throw e;
  // The guard refused it; the refusal is already on the log.
  console.log(`Refused by policy: ${e.message}`);
}
