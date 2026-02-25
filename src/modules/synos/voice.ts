/**
 * VoiceController — Web Speech API wrapper for Syn OS
 * Listens for wake word "synapse" then processes a command.
 *
 * Usage:
 *   import { VoiceController } from './voice';
 *   const vc = new VoiceController(onCommand);
 *   vc.start();
 */

export type VoiceCommand =
    | "scan"
    | "metrics"
    | "geo"
    | "indoor"
    | "threats"
    | "devices"
    | "security"
    | "stop";

export interface VoiceCommandEvent {
    command: VoiceCommand;
    raw: string;
}

type CommandHandler = (evt: VoiceCommandEvent) => void;
type StateHandler = (state: "listening" | "idle" | "unsupported") => void;

const COMMAND_MAP: Record<string, VoiceCommand> = {
    scan: "scan",
    "run scan": "scan",
    "start scan": "scan",
    metrics: "metrics",
    "show metrics": "metrics",
    "system metrics": "metrics",
    geo: "geo",
    "geo view": "geo",
    "outdoor": "geo",
    "outdoor map": "geo",
    indoor: "indoor",
    "indoor mode": "indoor",
    "indoor map": "indoor",
    threat: "threats",
    threats: "threats",
    "threat feed": "threats",
    "threat intel": "threats",
    devices: "devices",
    "device manager": "devices",
    "manage devices": "devices",
    security: "security",
    "security monitor": "security",
    stop: "stop",
    "stop listening": "stop",
};

const WAKE_WORD = "synapse";

export class VoiceController {
    private recognition: SpeechRecognition | null = null;
    private onCommand: CommandHandler;
    private onState: StateHandler;
    private _active = false;
    private _awake = false;  // true when wake word detected mid-sentence

    constructor(onCommand: CommandHandler, onState: StateHandler = () => { }) {
        this.onCommand = onCommand;
        this.onState = onState;
    }

    get supported(): boolean {
        return typeof window !== "undefined" &&
            ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    }

    start() {
        if (!this.supported) {
            this.onState("unsupported");
            return;
        }
        if (this._active) return;

        const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
        this.recognition = new SR() as SpeechRecognition;
        this.recognition.lang = "en-US";
        this.recognition.interimResults = false;
        this.recognition.continuous = true;

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.trim().toLowerCase();
                this._handleTranscript(transcript);
            }
        };

        this.recognition.onend = () => {
            // auto-restart unless stopped manually
            if (this._active) {
                setTimeout(() => this.recognition?.start(), 300);
            }
        };

        this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            if (e.error !== "no-speech" && e.error !== "aborted") {
                console.warn("[Voice] Error:", e.error);
            }
        };

        this._active = true;
        this.recognition.start();
        this.onState("listening");
    }

    stop() {
        this._active = false;
        this.recognition?.stop();
        this.recognition = null;
        this.onState("idle");
    }

    private _handleTranscript(text: string) {
        if (text.includes(WAKE_WORD)) {
            // Extract the command part after wake word
            const after = text.split(WAKE_WORD).pop()?.trim().replace(/^[,. ]+/, "") ?? "";
            const cmd = this._parseCommand(after);
            if (cmd) {
                this.onCommand({ command: cmd, raw: text });
            } else {
                // Wake word heard but no command — next utterance will be command
                this._awake = true;
                setTimeout(() => { this._awake = false; }, 4000);
            }
        } else if (this._awake) {
            const cmd = this._parseCommand(text);
            if (cmd) {
                this._awake = false;
                this.onCommand({ command: cmd, raw: text });
            }
        }
    }

    private _parseCommand(text: string): VoiceCommand | null {
        if (!text) return null;
        const cleaned = text.replace(/[^a-z ]/g, "").trim();
        // Exact match first
        if (cleaned in COMMAND_MAP) return COMMAND_MAP[cleaned];
        // Partial match
        for (const [key, cmd] of Object.entries(COMMAND_MAP)) {
            if (cleaned.includes(key)) return cmd;
        }
        return null;
    }
}
