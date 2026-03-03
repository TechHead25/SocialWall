import fs from "fs";
import path from "path";

function ensureFile(filePath, defaultValue) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf-8");
  }
}

export function readJson(filePath, defaultValue = []) {
  ensureFile(filePath, defaultValue);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function writeJson(filePath, data) {
  ensureFile(filePath, []);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
