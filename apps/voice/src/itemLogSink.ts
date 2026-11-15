import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ItemLogEvent } from "@may/shared";

/** Append-only truth (D-049). Postgres later; a JSONL file per session for the spike. */
export interface ItemLogSink {
  append: (e: ItemLogEvent) => Promise<void>;
}

export class FileItemLogSink implements ItemLogSink {
  constructor(private readonly dir: string) {}
  async append(e: ItemLogEvent): Promise<void> {
    const d = join(this.dir, "item-log");
    await mkdir(d, { recursive: true });
    await appendFile(join(d, `${e.sessionId}.jsonl`), `${JSON.stringify(e)}\n`, "utf8");
  }
}

export class MemoryItemLogSink implements ItemLogSink {
  readonly events: ItemLogEvent[] = [];
  async append(e: ItemLogEvent): Promise<void> {
    this.events.push(e);
  }
}
