import { promises as fs } from "fs";
import { app } from "electron";
import { join } from "path";
import isValidPath from "is-valid-path";

const FileName = "recent-repos-n.json";
const RecentLimit = 20;

export class RecentStore {
  private repos: string[];
  constructor() {
    this.repos = [];
  }

  async load(): Promise<void> {
    try {
      const file = join(app.getPath("userData"), FileName);
      const body = JSON.parse(await fs.readFile(file, "utf8"));
      if (!Array.isArray(body)) throw new Error("expected array");
      this.repos = body.filter((v) => isValidPath(v));
    } catch (err) {
      console.info("error loading recent repos", err);
      this.repos = [];
    }
  }

  all(): string[] {
    return [...this.repos];
  }

  async add(path: string): Promise<void> {
    const i = this.repos.indexOf(path);
    if (i !== -1) this.repos.splice(i, 1);
    this.repos.unshift(path);
    this.repos.splice(RecentLimit, this.repos.length);
    await this.save();
  }

  async remove(path: string): Promise<void> {
    const i = this.repos.indexOf(path);
    if (i !== -1) {
      this.repos.splice(i, 1);
      await this.save();
    }
  }

  async save(): Promise<void> {
    const file = join(app.getPath("userData"), FileName);
    await fs.writeFile(file, JSON.stringify(this.repos), "utf8");
  }
}
