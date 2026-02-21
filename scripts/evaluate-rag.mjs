#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    userId: "",
    dataset: "scripts/eval-dataset.json",
    endpoint: "http://localhost:3000/api/evaluate",
    out: "",
  };

  for (const arg of argv) {
    if (arg.startsWith("--userId=")) {
      args.userId = arg.replace("--userId=", "");
    } else if (arg.startsWith("--dataset=")) {
      args.dataset = arg.replace("--dataset=", "");
    } else if (arg.startsWith("--endpoint=")) {
      args.endpoint = arg.replace("--endpoint=", "");
    } else if (arg.startsWith("--out=")) {
      args.out = arg.replace("--out=", "");
    }
  }

  return args;
}

function readJson(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.userId) {
    console.error("Missing required argument: --userId=<SUPABASE_USER_ID>");
    process.exit(1);
  }

  const cases = readJson(args.dataset);

  const response = await fetch(args.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: args.userId,
      cases,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    console.error("Evaluation failed:", payload);
    process.exit(1);
  }

  console.log("Evaluation summary:");
  console.log(JSON.stringify(payload.summary, null, 2));

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(`Detailed report saved at: ${outPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
