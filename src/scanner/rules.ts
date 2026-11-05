export type Severity = "critical" | "high" | "medium" | "low";

export type Rule = {
  id: string;
  title: string;
  severity: Severity;
  category: "secrets" | "exfiltration" | "remote-code" | "miner" | "wallet-drain" | "prompt-injection" | "obfuscation" | "persistence" | "process" | "network";
  /** Tested line by line. */
  pattern: RegExp;
  why: string;
  /** Only test files whose path matches. */
  files?: RegExp;
};

const CODE = /\.(m?[jt]sx?|cjs|py|sh|bash|zsh|ps1|rb|go|rs|php|lua)$|(^|\/)(Dockerfile|Makefile)$/i;
const DOCS = /\.(md|mdx|txt|ya?ml|json)$/i;

export const RULES: Rule[] = [
  // --- secrets & key material
  {
    id: "wallet-key-file",
    title: "Reads a wallet key file",
    severity: "critical",
    category: "secrets",
    pattern: /(\.config[\/\\]solana[\/\\]id\.json|[\/\\]keystore[\/\\]|wallet\.dat|\.ethereum[\/\\]keystore|exodus[\/\\]exodus\.wallet|electrum[\/\\]wallets)/i,
    why: "Solana, Ethereum and Bitcoin wallet key files have no reason to be read by a skill.",
  },
  {
    id: "browser-wallet-data",
    title: "Touches browser wallet extension storage",
    severity: "critical",
    category: "secrets",
    pattern: /(nkbihfbeogaeaoehlefnkodbefgpgknn|bfnaelmomeimhlpmgjnjophhpkkoljpa|hnfanknocfeofbddgcijnmhnfnkdnaad|Local Extension Settings|egjidjbpglichdcondbcbdnbeeppgdph)/,
    why: "These are the storage folders of MetaMask, Phantom, Coinbase Wallet and Trust Wallet in the browser.",
  },
  {
    id: "ssh-keys",
    title: "Reads SSH keys or cloud credentials",
    severity: "critical",
    category: "secrets",
    pattern: /(\.ssh[\/\\](id_rsa|id_ed25519|id_ecdsa)|\.aws[\/\\]credentials|\.config[\/\\]gcloud|\.docker[\/\\]config\.json|\.npmrc|\.netrc)/i,
    why: "Private SSH keys and cloud credential files give full access to other systems.",
  },
  {
    id: "seed-phrase",
    title: "Handles a seed phrase or private key",
    severity: "high",
    category: "secrets",
    pattern: /\b(mnemonic|seed[_ -]?phrase|recovery[_ -]?phrase|private[_ -]?key|secret[_ -]?key|privkey)\b/i,
    files: CODE,
    why: "Legitimate skills rarely need raw key material. Check where this value goes.",
  },
  {
    id: "env-dump",
    title: "Collects the whole environment",
    severity: "high",
    category: "secrets",
    pattern: /(JSON\.stringify\(\s*process\.env\s*\)|Object\.(entries|keys|values)\(\s*process\.env\s*\)|dict\(\s*os\.environ\s*\)|os\.environ\.items\(\)|\benv\s*\|\s*(curl|nc|base64)|printenv\s*\|)/,
    why: "Reading every environment variable at once captures all API keys on the machine.",
  },

  // --- exfiltration
  {
    id: "webhook-sink",
    title: "Sends data to a webhook or paste service",
    severity: "high",
    category: "exfiltration",
    pattern: /(discord(app)?\.com\/api\/webhooks|api\.telegram\.org\/bot|hooks\.slack\.com\/services|webhook\.site|requestbin|pipedream\.net|pastebin\.com\/api|transfer\.sh|ngrok(-free)?\.(io|app)|interact\.sh|oast\.(fun|pro|live|site|online|me))/i,
    why: "Webhooks and paste sites are the most common way stolen keys leave a machine.",
  },
  {
    id: "raw-ip",
    title: "Connects to a raw IP address",
    severity: "medium",
    category: "network",
    pattern: /\b(https?|wss?|tcp):\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?/i,
    why: "Real services use domain names. A hard-coded IP often points at an attacker's server.",
  },

  // --- remote code
  {
    id: "pipe-to-shell",
    title: "Downloads and runs a script",
    severity: "critical",
    category: "remote-code",
    pattern: /(curl|wget|iwr|Invoke-WebRequest)[^\n|;]*\|\s*(sudo\s+)?(ba|z|da)?sh\b|(curl|wget)[^\n]*\|\s*python|\biex\s*\(|Invoke-Expression|powershell(\.exe)?\s+(-\w+\s+)*-e(nc|ncodedcommand)?\s/i,
    why: "Running code fetched at install time means the author can change what runs at any moment.",
  },
  {
    id: "eval-decoded",
    title: "Runs decoded or hidden code",
    severity: "critical",
    category: "remote-code",
    pattern: /(eval|Function|exec)\s*\(\s*(atob|Buffer\.from|base64\.b64decode|codecs\.decode|bytes\.fromhex|unescape)\b/,
    why: "Decoding a string and executing it is how malware hides its real behaviour from review.",
  },
  {
    id: "dynamic-eval",
    title: "Executes code from a string",
    severity: "high",
    category: "remote-code",
    pattern: /(^|[^.\w])(eval\s*\(|new\s+Function\s*\(|exec\s*\(\s*compile\()/,
    files: CODE,
    why: "Code built at runtime cannot be reviewed before it runs.",
  },
  {
    id: "download-exec",
    title: "Makes a downloaded file executable",
    severity: "high",
    category: "remote-code",
    pattern: /chmod\s+(\+x|[0-7]*7[0-7]*)\s+[^\n]*(\/tmp\/|\$TMPDIR|\.\/)|os\.chmod\([^)]*0o?7/,
    why: "Downloading a binary and marking it executable is a classic dropper pattern.",
  },
  {
    id: "install-hook",
    title: "Runs a script on install",
    severity: "medium",
    category: "remote-code",
    pattern: /"(pre|post)?install"\s*:\s*"/,
    files: /package\.json$/i,
    why: "Install hooks run automatically before you have used the skill. Check what they do.",
  },
  {
    id: "shell-spawn",
    title: "Spawns shell commands",
    severity: "low",
    category: "process",
    pattern: /(child_process|execSync\(|spawnSync\(|subprocess\.(run|Popen|call)\([^)]*shell\s*=\s*True|os\.system\()/,
    why: "Common in tools, but it means the skill can run anything on the machine.",
  },

  // --- miners
  {
    id: "miner",
    title: "Crypto miner",
    severity: "critical",
    category: "miner",
    pattern: /(xmrig|stratum\+(tcp|ssl):\/\/|minergate|coinhive|cryptonight|nicehash|--donate-level|randomx)/i,
    why: "Mining code burns your compute for someone else's wallet.",
  },

  // --- wallet drains
  {
    id: "unlimited-approval",
    title: "Grants an unlimited token approval",
    severity: "high",
    category: "wallet-drain",
    pattern: /(approve\s*\([^)]*(MaxUint256|maxUint256|MAX_UINT|2\s*\*\*\s*256|0x[fF]{60,}|uint256\(-1\)|type\(uint256\)\.max))|setApprovalForAll\s*\([^)]*true/,
    why: "An unlimited approval lets the spender take every token of that kind, now or later.",
  },
  {
    id: "permit-signature",
    title: "Asks for a permit signature",
    severity: "medium",
    category: "wallet-drain",
    pattern: /(signTypedData|eth_signTypedData_v4)[\s\S]{0,200}(Permit|PermitSingle|PermitBatch)|Permit2/,
    why: "Permit signatures move tokens without a visible transaction. Verify the spender.",
  },

  // --- prompt injection (skill docs and prompts)
  {
    id: "prompt-override",
    title: "Tries to override the agent's instructions",
    severity: "high",
    category: "prompt-injection",
    pattern: /(ignore (all |any )?(previous|prior|above|earlier) (instructions|rules)|disregard (your|the) (system|previous) (prompt|instructions)|you are now (in )?developer mode)/i,
    why: "Instructions hidden in a skill can take over the agent that loads it.",
  },
  {
    id: "prompt-secrecy",
    title: "Tells the agent to hide actions from the user",
    severity: "high",
    category: "prompt-injection",
    pattern: /(do not|don't|never) (tell|inform|show|notify|mention (this |it )?to) (the )?user|without (asking|telling|notifying) the user|silently (send|upload|transfer)/i,
    why: "A skill that asks for secrecy is hiding something from you.",
  },
  {
    id: "prompt-exfil",
    title: "Asks the agent to send secrets somewhere",
    severity: "critical",
    category: "prompt-injection",
    pattern: /(send|post|upload|forward|copy|paste)[^.\n]{0,60}(private key|seed phrase|mnemonic|api key|\.env|credentials|wallet file)/i,
    files: DOCS,
    why: "Instructions to move secrets are never legitimate.",
  },

  // --- obfuscation
  {
    id: "hidden-unicode",
    title: "Contains invisible or direction-flipping characters",
    severity: "high",
    category: "obfuscation",
    pattern: /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/,
    why: "Invisible characters can hide instructions or make code look different from what runs.",
  },
  {
    id: "long-base64",
    title: "Large encoded blob",
    severity: "medium",
    category: "obfuscation",
    pattern: /["'`][A-Za-z0-9+\/]{400,}={0,2}["'`]/,
    why: "Large encoded strings often hide a second payload.",
  },
  {
    id: "charcode-array",
    title: "Builds strings from character codes",
    severity: "medium",
    category: "obfuscation",
    pattern: /String\.fromCharCode\(\s*(\d{2,3}\s*,\s*){12,}|(\\x[0-9a-f]{2}){16,}/i,
    why: "Spelling a string out of character codes is a way to hide URLs and commands.",
  },

  // --- persistence
  {
    id: "persistence",
    title: "Installs itself to run at startup",
    severity: "high",
    category: "persistence",
    pattern: /(crontab\s+-|\/etc\/cron|schtasks\s+\/create|LaunchAgents|LaunchDaemons|systemctl\s+enable|\\Start Menu\\Programs\\Startup|>>\s*~?\/?\.?(bashrc|zshrc|profile))/i,
    why: "A skill has no reason to make itself start with the machine.",
  },
];

export const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 45, high: 18, medium: 7, low: 2 };
