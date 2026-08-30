import {
	ItemView,
	TAbstractFile,
	TFile,
	WorkspaceLeaf,
	debounce,
} from "obsidian";
import type { ViewStateResult } from "obsidian";
import {
	Compartment,
	EditorState,
	Prec,
	type Extension,
} from "@codemirror/state";
import {
	EditorView,
	drawSelection,
	highlightActiveLine,
	keymap,
	lineNumbers,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import {
	bracketMatching,
	codeFolding,
	defaultHighlightStyle,
	foldAll,
	foldGutter,
	foldKeymap,
	indentOnInput,
	indentUnit,
	syntaxHighlighting,
	unfoldAll,
} from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { detectKind, type DocKind } from "../core/detect";
import { applyEol, detectEol, stripBom, type Eol } from "../core/position";
import { FormatError, formatJsonc, formatYaml } from "../core/format";
import { validateDocument } from "../core/validate";
import type { MaterinCtxSettings } from "../settings";
import type MaterinCtxPlugin from "../main";

export const VIEW_TYPE_MATERIN_CTX = "materin-ctx-view";

const VALIDATE_DELAY_MS = 300;
const KIND_LABELS: Record<DocKind, string> = {
	json: "JSON",
	jsonc: "JSONC",
	yaml: "YAML",
};

export class CtxView extends ItemView {
	private readonly plugin: MaterinCtxPlugin;
	private file: TFile | null = null;
	private kind: DocKind = "json";
	private originalEol: Eol = "\n";
	private editor: EditorView | null = null;
	private dirty = false;
	private fileDeleted = false;
	/** mtime of the last write we made ourselves — external-change guard. */
	private lastSavedMtime = 0;

	private readonly indentComp = new Compartment();
	private readonly wrapComp = new Compartment();
	private readonly lineNumComp = new Compartment();

	private titleEl!: HTMLElement;
	private badgeEl!: HTMLElement;
	private dirtyEl!: HTMLElement;
	private bannerEl!: HTMLElement;
	private statusEl!: HTMLElement;
	private saveButton!: HTMLButtonElement;

	private readonly scheduleValidation = debounce(
		() => this.runValidation(),
		VALIDATE_DELAY_MS,
		true,
	);

	constructor(leaf: WorkspaceLeaf, plugin: MaterinCtxPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.navigation = true;
	}

	getViewType(): string {
		return VIEW_TYPE_MATERIN_CTX;
	}

	getDisplayText(): string {
		return this.file?.name ?? "Materin Ctx";
	}

	getIcon(): string {
		return "braces";
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const filePath = (state as { file?: unknown })?.file;
		if (typeof filePath === "string") {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile && file !== this.file) {
				await this.loadFile(file);
			}
		}
		await super.setState(state, result);
	}

	getState(): Record<string, unknown> {
		return { ...super.getState(), file: this.file?.path };
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("materin-ctx-view");

		const header = this.contentEl.createDiv({ cls: "materin-ctx-header" });
		this.titleEl = header.createDiv({ cls: "materin-ctx-title" });
		this.badgeEl = header.createSpan({ cls: "materin-ctx-badge" });
		this.dirtyEl = header.createSpan({ cls: "materin-ctx-dirty", text: "●" });
		this.dirtyEl.hide();
		const actions = header.createDiv({ cls: "materin-ctx-actions" });
		actions
			.createEl("button", { text: "格式化" })
			.addEventListener("click", () => this.formatDocument());
		actions
			.createEl("button", { text: "全部折叠" })
			.addEventListener("click", () => this.foldAllNodes());
		actions
			.createEl("button", { text: "全部展开" })
			.addEventListener("click", () => this.unfoldAllNodes());
		this.saveButton = actions.createEl("button", {
			text: "保存",
			cls: "materin-ctx-save",
		});
		this.saveButton.addEventListener("click", () => {
			void this.saveFile();
		});

		this.bannerEl = this.contentEl.createDiv({ cls: "materin-ctx-banner" });
		this.bannerEl.hide();
		this.contentEl.createDiv({ cls: "materin-ctx-editor" });
		this.statusEl = this.contentEl.createDiv({ cls: "materin-ctx-status" });

		this.registerEvent(
			this.app.vault.on("modify", (file) => this.onVaultModify(file)),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => this.onVaultDelete(file)),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) =>
				this.onVaultRename(file, oldPath),
			),
		);
	}

	async onClose(): Promise<void> {
		this.editor?.destroy();
		this.editor = null;
		this.contentEl.empty();
	}

	/** Applies the current plugin settings to the open editor without a rebuild. */
	applySettings(): void {
		if (!this.editor) {
			return;
		}
		const settings = this.plugin.settings;
		this.editor.dispatch({
			effects: [
				this.indentComp.reconfigure(indentUnit.of(this.indentUnitString())),
				this.wrapComp.reconfigure(
					settings.wrapLines ? EditorView.lineWrapping : [],
				),
				this.lineNumComp.reconfigure(
					settings.showLineNumbers ? lineNumbers() : [],
				),
			],
		});
	}

	formatDocument(): void {
		const view = this.editor;
		if (!view || this.fileDeleted) {
			return;
		}
		const text = view.state.doc.toString();
		const settings = this.plugin.settings;
		let formatted: string;
		try {
			formatted =
				this.kind === "yaml"
					? formatYaml(text, {
							indentType: settings.indentType,
							indentSize: settings.indentSize,
							lineWidth: settings.yamlLineWidth,
						})
					: formatJsonc(text, {
							indentType: settings.indentType,
							indentSize: settings.indentSize,
						});
		} catch (error) {
			if (error instanceof FormatError) {
				this.setStatus(
					"error",
					`格式化失败：第 ${error.line} 行第 ${error.column} 列 — ${error.message}`,
				);
			} else {
				this.setStatus("error", `格式化失败：${String(error)}`);
			}
			return;
		}
		if (formatted === text) {
			this.setStatus("ok", "格式无变化");
			return;
		}
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: formatted },
		});
		this.setStatus("ok", "已格式化（未保存）");
	}

	foldAllNodes(): void {
		if (this.editor) {
			foldAll(this.editor);
		}
	}

	unfoldAllNodes(): void {
		if (this.editor) {
			unfoldAll(this.editor);
		}
	}

	async saveFile(): Promise<void> {
		const view = this.editor;
		const file = this.file;
		if (!view || !file || this.fileDeleted || !this.dirty) {
			return;
		}
		const text = view.state.doc.toString();
		await this.app.vault.modify(file, applyEol(text, this.originalEol));
		this.lastSavedMtime = file.stat.mtime;
		this.setDirty(false);
		this.setStatus("ok", "已保存");
	}

	private async loadFile(file: TFile): Promise<void> {
		this.file = file;
		this.fileDeleted = false;
		this.kind = detectKind(file.path) ?? "json";
		const raw = await this.app.vault.read(file);
		const content = stripBom(raw);
		this.originalEol = detectEol(content);
		this.lastSavedMtime = file.stat.mtime;

		this.titleEl.setText(file.name);
		this.badgeEl.setText(KIND_LABELS[this.kind]);
		this.badgeEl.addClass(`materin-ctx-badge-${this.kind}`);
		this.hideBanner();
		this.buildEditor(content);
		this.setDirty(false);
		if (this.plugin.settings.foldOnOpen === "all") {
			this.foldAllNodes();
		}
		this.runValidation();
	}

	private buildEditor(content: string): void {
		const container = this.contentEl.querySelector<HTMLElement>(
			".materin-ctx-editor",
		);
		if (!container) {
			return;
		}
		this.editor?.destroy();
		this.editor = new EditorView({
			state: EditorState.create({
				doc: content,
				extensions: this.buildExtensions(this.plugin.settings),
			}),
			parent: container,
		});
	}

	private buildExtensions(settings: MaterinCtxSettings): Extension[] {
		return [
			this.lineNumComp.of(settings.showLineNumbers ? lineNumbers() : []),
			foldGutter(),
			codeFolding(),
			history(),
			drawSelection(),
			highlightActiveLine(),
			indentOnInput(),
			bracketMatching(),
			syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
			this.indentComp.of(indentUnit.of(this.indentUnitString())),
			this.wrapComp.of(settings.wrapLines ? EditorView.lineWrapping : []),
			this.kind === "yaml" ? yaml() : json(),
			Prec.highest(
				keymap.of([
					{
						key: "Mod-s",
						run: () => {
							void this.saveFile();
							return true;
						},
					},
				]),
			),
			keymap.of([
				...defaultKeymap,
				...historyKeymap,
				...searchKeymap,
				...foldKeymap,
			]),
			search({ top: true }),
			EditorView.theme({
				"&": { height: "100%" },
				".cm-scroller": {
					overflow: "auto",
					fontFamily: "var(--font-monospace)",
				},
				".cm-gutters": {
					backgroundColor: "var(--background-secondary)",
					borderColor: "var(--background-modifier-border)",
				},
				".cm-activeLine": {
					backgroundColor: "var(--background-secondary)",
				},
			}),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					this.setDirty(true);
					this.scheduleValidation();
				}
			}),
		];
	}

	private indentUnitString(): string {
		const settings = this.plugin.settings;
		return settings.indentType === "tab"
			? "\t"
			: " ".repeat(settings.indentSize);
	}

	private setDirty(value: boolean): void {
		this.dirty = value;
		this.dirtyEl.toggle(!value);
		this.saveButton.disabled = !value || this.fileDeleted;
	}

	private runValidation(): void {
		const view = this.editor;
		if (!view) {
			return;
		}
		const text = view.state.doc.toString();
		const result = validateDocument(text, this.kind);
		if (result.ok) {
			this.setStatus(
				"ok",
				`${KIND_LABELS[this.kind]} 有效 · ${view.state.doc.lines} 行`,
			);
			return;
		}
		const errorEl = this.setStatus(
			"error",
			`第 ${result.line} 行第 ${result.column} 列 — ${result.message}（点击定位）`,
		);
		errorEl.addEventListener("click", () => {
			this.jumpToPosition(result.line, result.column);
		});
	}

	private jumpToPosition(line: number, column: number): void {
		const view = this.editor;
		if (!view) {
			return;
		}
		const doc = view.state.doc;
		const docLine = doc.line(Math.min(Math.max(line, 1), doc.lines));
		const pos = Math.min(docLine.from + Math.max(column - 1, 0), docLine.to);
		view.dispatch({
			selection: { anchor: pos },
			effects: EditorView.scrollIntoView(pos, { y: "center" }),
		});
		view.focus();
	}

	private setStatus(level: "ok" | "error", message: string): HTMLElement {
		this.statusEl.empty();
		return this.statusEl.createSpan({
			cls: `materin-ctx-status-${level}`,
			text: message,
		});
	}

	private showBanner(message: string, withReload: boolean): void {
		this.bannerEl.empty();
		this.bannerEl.createSpan({ text: message });
		if (withReload) {
			this.bannerEl
				.createEl("button", { text: "重载" })
				.addEventListener("click", () => {
					void this.reloadFromDisk();
				});
		}
		this.bannerEl.show();
	}

	private hideBanner(): void {
		this.bannerEl.empty();
		this.bannerEl.hide();
	}

	private async reloadFromDisk(): Promise<void> {
		const view = this.editor;
		const file = this.file;
		if (!view || !file || this.fileDeleted) {
			return;
		}
		const content = stripBom(await this.app.vault.read(file));
		this.originalEol = detectEol(content);
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: content },
		});
		this.lastSavedMtime = file.stat.mtime;
		this.setDirty(false);
		this.hideBanner();
	}

	private onVaultModify(file: TAbstractFile): void {
		if (!(file instanceof TFile) || file !== this.file) {
			return;
		}
		if (file.stat.mtime === this.lastSavedMtime) {
			return; // our own save echoing back
		}
		if (this.dirty) {
			this.showBanner("文件已在磁盘上被修改。重载将丢弃未保存的改动。", true);
		} else {
			void this.reloadFromDisk();
		}
	}

	private onVaultDelete(file: TAbstractFile): void {
		if (!(file instanceof TFile) || file !== this.file) {
			return;
		}
		this.fileDeleted = true;
		this.saveButton.disabled = true;
		this.showBanner("文件已被删除或移动，编辑器内容仅供查看。", false);
	}

	private onVaultRename(file: TAbstractFile, oldPath: string): void {
		if (!(file instanceof TFile) || oldPath !== this.file?.path) {
			return;
		}
		this.file = file;
		const newKind = detectKind(file.path);
		if (newKind && newKind !== this.kind) {
			// extension changed category — rebuild with the new language
			void this.loadFile(file);
			return;
		}
		this.titleEl.setText(file.name);
	}
}
