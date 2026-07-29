const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  console.error(
    `Unsupported Node.js ${process.versions.node}. Use Node.js 22 or newer.`,
  );
  process.exit(1);
}
const expected = '11.5.1';
const actual = process.env.npm_config_user_agent?.match(
  /pnpm\/(\d+\.\d+\.\d+)/,
)?.[1];
if (actual && actual !== expected) {
  console.error(`Unsupported pnpm ${actual}. Use pnpm ${expected}.`);
  process.exit(1);
}
console.log(`Toolchain OK: Node ${process.versions.node}, pnpm ${expected}.`);
