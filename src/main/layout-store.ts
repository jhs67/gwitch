import { promises as fs } from "fs";
import punycode from "punycode";
import { app } from "electron";
import { join } from "path";
import { LayoutState } from "@ipc/layout";

const Prefix = "lt-";

function pathToPath(path: string) {
  return join(
    app.getPath("userData"),
    Prefix +
      punycode.encode(
        path.replace(/[^\w\-x.]/g, function (a) {
          return a === "x" ? "xx" : "x" + a.charCodeAt(0).toString(16) + "-";
        }),
      ),
  );
}

export class LayoutStore {
  async load(path: string): Promise<LayoutState | undefined> {
    try {
      return JSON.parse(await fs.readFile(pathToPath(path), "utf8"));
    } catch (err) {
      console.info("error loading layout state", err);
      return;
    }
  }

  async save(path: string, body: LayoutState): Promise<void> {
    await fs.writeFile(pathToPath(path), JSON.stringify(body), "utf8");
  }
}
