import fs from "node:fs";
import path from "node:path";

/**
 * Persistent set of relative paths already posted, keyed by model folder.
 * Shape: { version: 1, models: { "<model>": ["file.jpg", ...] }, lastPostAt?: string }
 */
export class PostedState {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { version: 1, models: {}, lastPostAt: null, lastModel: null };
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw);
        this.data = {
          version: 1,
          models: parsed.models && typeof parsed.models === "object" ? parsed.models : {},
          lastPostAt: parsed.lastPostAt ?? null,
          lastModel: parsed.lastModel ?? null,
        };
      }
    } catch (err) {
      console.warn(`[state] Could not read ${this.filePath}, starting fresh:`, err.message);
      this.data = { version: 1, models: {}, lastPostAt: null, lastModel: null };
    }
    return this;
  }

  save() {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  getPosted(model) {
    return new Set(this.data.models[model] || []);
  }

  markPosted(model, filenames) {
    const existing = this.data.models[model] || [];
    const set = new Set(existing);
    for (const name of filenames) set.add(name);
    this.data.models[model] = [...set].sort();
    this.data.lastPostAt = new Date().toISOString();
    this.data.lastModel = model;
    this.save();
  }

  /** When every file in a model has been used, clear so the cycle can restart. */
  resetModel(model) {
    this.data.models[model] = [];
    this.save();
  }

  summary() {
    const models = Object.keys(this.data.models);
    const total = models.reduce(
      (n, m) => n + (this.data.models[m]?.length || 0),
      0,
    );
    return {
      modelsTracked: models.length,
      filesTracked: total,
      lastPostAt: this.data.lastPostAt,
      lastModel: this.data.lastModel,
    };
  }
}
