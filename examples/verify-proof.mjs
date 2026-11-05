// Re-verify a machine's public Proof-of-Behavior log. Usage: node examples/verify-proof.mjs <machine-id>
import { verifyProof } from "adyros/proof";

const id = process.argv[2];
if (!id) {
  console.error("Usage: node examples/verify-proof.mjs <machine-id>");
  process.exit(1);
}

const v = await verifyProof(id);
console.log(JSON.stringify(v, null, 2));
