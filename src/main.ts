import { Plugin, WorkspaceLeaf } from "obsidian";
import { CtxView, VIEW_TYPE_MATERIN_CTX } from "./view/CtxView";
import {
	MaterinCtxSettingTab,
	type MaterinCtxSettings,
	DEFAULT_SETTINGS,
} from "./settings";

export default class MaterinCtxPlugin extends Plugin {
	public settings: MaterinCtxSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.registerView(
			VIEW_TYPE_MATERIN_CTX,
			(leaf: WorkspaceLeaf) => new CtxView(leaf, this),
		);
		this.registerExtensions(
			["json", "yaml", "yml", "jsonc"],
			VIEW_TYPE_MATERIN_CTX,
		);

		this.addCommand({
			id: "format-document",
			name: "Format document",
			checkCallback: (checking) =>
				this.withActiveView((view) => view.formatDocument(), checking),
		});
		this.addCommand({
			id: "fold-all",
			name: "Fold all",
			checkCallback: (checking) =>
				this.withActiveView((view) => view.foldAllNodes(), checking),
		});
		this.addCommand({
			id: "unfold-all",
			name: "Unfold all",
			checkCallback: (checking) =>
				this.withActiveView((view) => view.unfoldAllNodes(), checking),
		});
		this.addCommand({
			id: "save-file",
			name: "Save file",
			checkCallback: (checking) =>
				this.withActiveView((view) => void view.saveFile(), checking),
		});

		this.addSettingTab(new MaterinCtxSettingTab(this));
	}

	async loadSettings(): Promise<void> {
		this.settings = {
			...DEFAULT_SETTINGS,
			...((await this.loadData()) as Partial<MaterinCtxSettings> | null),
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Fans the current settings out to every open editor view. */
	notifyViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(
			VIEW_TYPE_MATERIN_CTX,
		)) {
			if (leaf.view instanceof CtxView) {
				leaf.view.applySettings();
			}
		}
	}

	private withActiveView(
		apply: (view: CtxView) => void,
		checking: boolean,
	): boolean {
		const view = this.app.workspace.getActiveViewOfType(CtxView);
		if (!view) {
			return false;
		}
		if (!checking) {
			apply(view);
		}
		return true;
	}
}
