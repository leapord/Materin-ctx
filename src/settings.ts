import { PluginSettingTab, Setting } from "obsidian";
import type MaterinCtxPlugin from "./main";
import { _ } from "./i18n";

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
			.setDesc(_("Character used for indentation. YAML forbids tab indentation, so YAML formatting falls back to spaces."))
			.addDropdown((dropdown) =>
				dropdown
					.addOption("space", _("Spaces"))
					.addOption("tab", _("Tab"))
					.setValue(this.plugin.settings.indentType)
					.onChange(async (value) => {
						await this.updateSettings({
							indentType: value === "tab" ? "tab" : "space",
						});
					}),
			);

		new Setting(containerEl)
			.setName("Indent size")
			.setDesc(_("Indent width (number of spaces, or tab width)."))
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
			.setDesc(_("Visually wrap long lines (does not change the file contents)."))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.wrapLines)
					.onChange(async (value) => {
						await this.updateSettings({ wrapLines: value });
					}),
			);

		new Setting(containerEl)
			.setName("Line numbers")
			.setDesc(_("Show line numbers in the editor gutter."))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showLineNumbers)
					.onChange(async (value) => {
						await this.updateSettings({ showLineNumbers: value });
					}),
			);

		new Setting(containerEl)
			.setName("Fold on open")
			.setDesc(_("Fold all foldable nodes when a file is opened."))
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", _("Don't fold"))
					.addOption("all", _("Fold all"))
					.setValue(this.plugin.settings.foldOnOpen)
					.onChange(async (value) => {
						await this.updateSettings({
							foldOnOpen: value === "all" ? "all" : "none",
						});
					}),
			);

		new Setting(containerEl)
			.setName("YAML line width")
			.setDesc(_("Maximum line width when formatting YAML. 0 means unlimited."))
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
