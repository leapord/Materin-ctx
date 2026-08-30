import { PluginSettingTab, Setting } from "obsidian";
import type MaterinCtxPlugin from "./main";

export interface MaterinCtxSettings {
	/** Indentation character used by the editor and the formatter. */
	indentType: "space" | "tab";
	/** Indent width for spaces; YAML formatting always falls back to spaces. */
	indentSize: number;
	/** Wrap long lines in the editor. */
	wrapLines: boolean;
	/** Show the line-number gutter. */
	showLineNumbers: boolean;
	/** Fold every collapsible node when a file opens. */
	foldOnOpen: "none" | "all";
	/** Maximum YAML line width when formatting; 0 disables wrapping. */
	yamlLineWidth: number;
}

export const DEFAULT_SETTINGS: MaterinCtxSettings = {
	indentType: "space",
	indentSize: 2,
	wrapLines: true,
	showLineNumbers: true,
	foldOnOpen: "none",
	yamlLineWidth: 0,
};

const INDENT_SIZES = [2, 4, 8];

export class MaterinCtxSettingTab extends PluginSettingTab {
	private readonly plugin: MaterinCtxPlugin;

	constructor(plugin: MaterinCtxPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Indent character")
			.setDesc("缩进字符。YAML 规范禁止 Tab 缩进，YAML 格式化会退回使用空格。")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("space", "空格")
					.addOption("tab", "Tab")
					.setValue(this.plugin.settings.indentType)
					.onChange(async (value) => {
						await this.updateSettings({
							indentType: value === "tab" ? "tab" : "space",
						});
					}),
			);

		new Setting(containerEl)
			.setName("Indent size")
			.setDesc("缩进宽度（空格数或 Tab 宽度）。")
			.addDropdown((dropdown) => {
				for (const size of INDENT_SIZES) {
					dropdown.addOption(String(size), String(size));
				}
				return dropdown
					.setValue(String(this.plugin.settings.indentSize))
					.onChange(async (value) => {
						await this.updateSettings({ indentSize: Number(value) });
					});
			});

		new Setting(containerEl)
			.setName("Wrap long lines")
			.setDesc("超长行自动换行显示（不影响文件内容）。")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.wrapLines)
					.onChange(async (value) => {
						await this.updateSettings({ wrapLines: value });
					}),
			);

		new Setting(containerEl)
			.setName("Line numbers")
			.setDesc("在编辑器左侧显示行号。")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showLineNumbers)
					.onChange(async (value) => {
						await this.updateSettings({ showLineNumbers: value });
					}),
			);

		new Setting(containerEl)
			.setName("Fold on open")
			.setDesc("打开文件时是否折叠所有可折叠节点。")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", "不折叠")
					.addOption("all", "全部折叠")
					.setValue(this.plugin.settings.foldOnOpen)
					.onChange(async (value) => {
						await this.updateSettings({
							foldOnOpen: value === "all" ? "all" : "none",
						});
					}),
			);

		new Setting(containerEl)
			.setName("YAML line width")
			.setDesc("格式化 YAML 时的最大行宽，0 表示不限制。")
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.yamlLineWidth))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						await this.updateSettings({
							yamlLineWidth: Number.isNaN(parsed) || parsed < 0 ? 0 : parsed,
						});
					}),
			);
	}

	private async updateSettings(
		patch: Partial<MaterinCtxSettings>,
	): Promise<void> {
		this.plugin.settings = { ...this.plugin.settings, ...patch };
		await this.plugin.saveSettings();
		this.plugin.notifyViews();
	}
}
