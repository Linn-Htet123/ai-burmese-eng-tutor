import {
  ITEM_LOG_TOOL_NAMES,
  type ClientMessage,
  type ItemLogEvent,
  type ItemLogToolName,
  type MayState,
  type ServerMessage,
  type SessionPlan,
  type StagePlan,
} from "@may/shared";
import {
  applyToolCall,
  buildShortTermHandover,
  buildStageSystemPrompt,
  createGuardState,
  type GuardState,
} from "@may/brain";
import { config } from "./config.ts";
import type { ItemLogSink } from "./itemLogSink.ts";
import type { StageSession, StageSessionFactory } from "./stageSession.ts";

/** Tools whose response May waits for (mirrors geminiStage BLOCKING set). */
const WAITING_TOOLS = new Set<ItemLogToolName>(["offer_upgrade", "request_repeat"]);

export interface ConductorIO {
  send: (m: ServerMessage) => void;
  sendAudio: (pcm: Buffer) => void;
  openStage: StageSessionFactory;
  sink: ItemLogSink;
  log?: (msg: string, data?: Record<string, unknown>) => void;
  now?: () => number;
}

export interface ConductorOptions {
  longTermChart: string;
  uiLanguage: "my" | "en";
}

/**
 * The live conductor (doc 04 §2), in TypeScript: stage switching with pre-warm, soft timers,
 * handover building, nudge delivery, pause/resume, and the tool gate.
 * Patterns: Tool Use (ch. 5) with Tool Use Restriction as the guardrail (ch. 18),
 * Memory (ch. 8) for handover, Exception Handling (ch. 12) for reopen-on-drop.
 */
export class SessionConductor {
  private stageIndex = -1;
  private current: StageSession | undefined;
  private prewarmed: { index: number; session: StageSession } | undefined;
  private guard: GuardState;
  private readonly handoverNotes: string[] = [];
  private mayState: MayState = "listening";
  private paused = false;
  private ended = false;
  private wrapRequested = false;
  private stageOpenedAt = 0;
  private lastVadStartAt = 0;
  private lastVadEndAt = 0;
  private awaitingFirstAudio = false;
  private bargePending = false;
  private upgradeCount = 0;
  private usage = { prompt: 0, response: 0 };
  private reopenedOnce = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private pauseTimer: ReturnType<typeof setTimeout> | undefined;
  private eventSeq = 0;

  constructor(
    private readonly plan: SessionPlan,
    private readonly io: ConductorIO,
    private readonly opts: ConductorOptions,
  ) {
    this.guard = createGuardState("none");
  }

  private now(): number {
    return this.io.now ? this.io.now() : Date.now();
  }

  get state(): MayState {
    return this.mayState;
  }

  async start(): Promise<void> {
    this.io.send({ type: "ready", sessionId: this.plan.sessionId, stageCount: this.plan.stages.length });
    await this.enterStage(0);
  }

  // ---- client side -------------------------------------------------------

  onClientAudio(pcm: Buffer): void {
    if (this.ended || this.paused || !this.current) return;
    this.current.sendAudio(pcm);
  }

  async onClientMessage(m: ClientMessage): Promise<void> {
    if (this.ended) return;
    switch (m.type) {
      case "hello":
        return;
      case "vad":
        if (m.speaking) {
          this.lastVadStartAt = this.now();
          if (this.mayState === "speaking") this.bargePending = true;
        } else {
          this.lastVadEndAt = this.now();
          // Flush Gemini's buffered audio now instead of waiting for its own silence timer (R-TE-1, R-TE-3).
          if (!this.paused) this.current?.sendAudioStreamEnd();
          if (this.mayState === "listening") {
            this.awaitingFirstAudio = true;
            this.setState("thinking");
          }
        }
        return;
      case "control":
        switch (m.action) {
          case "pause":
            this.paused = true;
            this.current?.sendAudioStreamEnd();
            this.pauseTimer = setTimeout(() => void this.end("paused_out"), config.pauseHoldMs);
            return;
          case "resume":
            this.paused = false;
            if (this.pauseTimer) clearTimeout(this.pauseTimer);
            return;
          case "burmese":
            this.current?.sendText(
              "[The learner pressed the Burmese help button] Switch to Burmese now, explain the current point simply, then return to English practice.",
              { generate: true },
            );
            return;
          case "end":
            await this.end("learner");
            return;
        }
        return;
      case "playback_done":
        return;
    }
  }

  // ---- stages ------------------------------------------------------------

  private stage(i: number): StagePlan {
    const s = this.plan.stages[i];
    if (!s) throw new Error(`no stage ${i}`);
    return s;
  }

  private systemPrompt(i: number): string {
    return buildStageSystemPrompt({
      stage: this.stage(i),
      stageIndex: i,
      stageCount: this.plan.stages.length,
      level: this.plan.level,
      topic: this.plan.topic,
      longTermChart: this.opts.longTermChart,
      shortTermHandover: buildShortTermHandover(this.handoverNotes),
      uiLanguage: this.opts.uiLanguage,
    });
  }

  private async open(i: number): Promise<StageSession> {
    return this.io.openStage({
      systemInstruction: this.systemPrompt(i),
      stage: this.stage(i),
      level: this.plan.level,
      handlers: {
        onAudio: (pcm) => this.onMayAudio(i, pcm),
        onToolCall: (c) => this.onToolCall(i, c),
        onInterrupted: () => this.onInterrupted(i),
        onTurnComplete: () => void this.onTurnComplete(i),
        onTranscript: (role, text, final) => {
          if (i === this.stageIndex) this.io.send({ type: "transcript", role, text, final });
        },
        onUsage: (u) => {
          this.usage.prompt += u.prompt;
          this.usage.response += u.response;
        },
        onClose: (reason) => void this.onStageClosed(i, reason),
        onError: (err) => this.io.log?.("stage error", { stage: i, err: err.message }),
      },
    });
  }

  private async enterStage(i: number): Promise<void> {
    const old = this.current;
    this.clearTimers();
    const session = this.prewarmed?.index === i ? this.prewarmed.session : await this.open(i);
    this.prewarmed = undefined;
    this.stageIndex = i;
    this.current = session;
    this.guard = createGuardState(this.stage(i).kind);
    this.wrapRequested = false;
    this.stageOpenedAt = this.now();
    old?.close();
    const s = this.stage(i);
    this.io.send({ type: "stage", kind: s.kind, index: i, total: this.plan.stages.length, budgetMinutes: s.budgetMinutes });
    this.setState("thinking");
    this.awaitingFirstAudio = true;
    this.lastVadEndAt = this.now();
    // D-046: the cached transition line goes here once recorded; for the spike May opens live.
    session.sendText("Begin the stage now with your opening line.", { generate: true });

    const budgetMs = s.budgetMinutes * 60_000;
    if (i + 1 < this.plan.stages.length) {
      this.timers.push(setTimeout(() => void this.prewarm(i + 1), Math.max(0, budgetMs - config.prewarmMs)));
    }
    // Soft budget: near the end May is asked to wrap when natural, never cut off (doc 04 §2).
    this.timers.push(
      setTimeout(() => {
        if (this.stageIndex === i && !this.wrapRequested) {
          this.current?.sendText("[coach note, do not read aloud] Time for this stage is nearly up. Finish the current item, then call stage_wrap_ready.", { generate: false });
        }
      }, budgetMs),
    );
  }

  private async prewarm(i: number): Promise<void> {
    if (this.ended || this.prewarmed || i !== this.stageIndex + 1) return;
    try {
      const session = await this.open(i);
      this.prewarmed = { index: i, session };
    } catch (err) {
      this.io.log?.("prewarm failed", { stage: i, err: String(err) });
    }
  }

  private async advance(): Promise<void> {
    if (this.ended) return;
    if (this.stageIndex + 1 >= this.plan.stages.length) {
      await this.end("complete");
      return;
    }
    await this.enterStage(this.stageIndex + 1);
  }

  // ---- model side --------------------------------------------------------

  private onMayAudio(i: number, pcm: Buffer): void {
    if (i !== this.stageIndex || this.ended) return;
    if (this.awaitingFirstAudio) {
      this.awaitingFirstAudio = false;
      this.io.send({ type: "metrics", responseMs: this.now() - this.lastVadEndAt });
    }
    this.setState("speaking");
    this.io.sendAudio(pcm);
  }

  private onInterrupted(i: number): void {
    if (i !== this.stageIndex || this.ended) return;
    this.io.send({ type: "interrupted" });
    if (this.bargePending) {
      this.bargePending = false;
      this.io.send({ type: "metrics", bargeInMs: this.now() - this.lastVadStartAt });
    }
    this.setState("listening");
  }

  private async onTurnComplete(i: number): Promise<void> {
    if (i !== this.stageIndex || this.ended) return;
    this.awaitingFirstAudio = false;
    this.setState("listening");
    if (this.wrapRequested) await this.advance();
  }

  private onToolCall(i: number, c: { id: string; name: string; args: Record<string, unknown> }): void {
    if (i !== this.stageIndex || this.ended || !this.current) return;
    if (!(ITEM_LOG_TOOL_NAMES as string[]).includes(c.name)) {
      this.current.sendToolResponse({ id: c.id, name: c.name, response: { status: "error", message: "unknown tool" }, mode: "silent" });
      return;
    }
    const name = c.name as ItemLogToolName;
    const tMs = this.now() - this.stageOpenedAt;
    const r = applyToolCall(this.guard, name, c.args, tMs, { pool: this.stage(i).pool });
    this.guard = r.state;

    const event: ItemLogEvent = {
      id: `${this.plan.sessionId}-${(this.eventSeq += 1)}`,
      sessionId: this.plan.sessionId,
      stage: this.stage(i).kind,
      at: new Date(this.now()).toISOString(),
      tMs,
      tool: name,
      args: c.args,
      gate: r.gate.allowed ? "allowed" : "blocked",
      ...(r.gate.allowed ? {} : { gateReason: r.gate.instruction }),
    };
    // Answer the gate first: May may be waiting on it mid-sentence. The log write must never crash the call.
    if (!r.gate.allowed) {
      this.current.sendToolResponse({ id: c.id, name, response: { status: "blocked", instruction: r.gate.instruction }, mode: "interrupt" });
    } else {
      this.current.sendToolResponse({
        id: c.id,
        name,
        response: { status: "ok" },
        mode: WAITING_TOOLS.has(name) ? "continue" : "silent",
      });
    }

    this.io.sink.append(event).catch((err: unknown) => this.io.log?.("item log write failed", { err: String(err), event: event.id }));

    if (r.gate.allowed && name === "offer_upgrade") {
      const a = c.args as { item_id: string; learner_said: string; better_line: string; reason_my: string };
      this.upgradeCount += 1;
      this.io.send({
        type: "upgrade",
        card: {
          itemId: a.item_id,
          learnerSaid: a.learner_said,
          betterLine: a.better_line,
          reasonMy: a.reason_my,
          index: this.upgradeCount,
          total: Math.max(this.upgradeCount, this.plan.stages.reduce((n, s) => n + s.items.length, 0)),
        },
      });
    }
    if (r.nudge) {
      this.current.sendText(`[coach note, do not read aloud] ${r.nudge}`, { generate: false });
    }
    if (name === "stage_wrap_ready") {
      const note = (c.args as { note?: string }).note;
      if (note) this.handoverNotes.push(`${this.stage(i).kind}: ${note}`);
      this.wrapRequested = true;
    }
  }

  private async onStageClosed(i: number, reason: string): Promise<void> {
    if (i !== this.stageIndex || this.ended) return;
    this.io.log?.("stage closed", { stage: i, reason });
    // R-TE-6: one reopen with the same handover, prior audio is never resent (R-TE-5).
    if (!this.reopenedOnce) {
      this.reopenedOnce = true;
      try {
        this.current = await this.open(i);
        this.io.send({ type: "transcript", role: "may", text: "(reconnecting…)", final: true });
        return;
      } catch (err) {
        this.io.log?.("reopen failed", { err: String(err) });
      }
    }
    this.io.send({ type: "error", code: "stage_closed", message: reason });
    await this.end("error");
  }

  // ---- lifecycle ---------------------------------------------------------

  async end(reason: "complete" | "learner" | "paused_out" | "error"): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.clearTimers();
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.current?.close();
    this.prewarmed?.session.close();
    this.io.send({ type: "metrics", tokens: { ...this.usage } });
    this.io.send({ type: "ended", reason });
  }

  private setState(v: MayState): void {
    if (v === this.mayState) return;
    this.mayState = v;
    this.io.send({ type: "state", value: v });
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }
}
