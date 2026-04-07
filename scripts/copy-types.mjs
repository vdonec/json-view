import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(currentDir, "../src/jsonview.d.ts");
const destinationPath = resolve(currentDir, "../dist/jsonview.d.ts");

await mkdir(dirname(destinationPath), { recursive: true });
await copyFile(sourcePath, destinationPath);

