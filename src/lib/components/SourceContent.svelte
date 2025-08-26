<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { EditorView } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { keymap } from '@codemirror/view';
	import { placeholder } from '@codemirror/view';
	import { javascript } from '@codemirror/lang-javascript';
	import { markdown } from '@codemirror/lang-markdown';
	import { html } from '@codemirror/lang-html';
	import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
	import { Play } from 'lucide-svelte';
	import type { SourceValueChangeEvent } from './event-types';

	let {
		id,
		kind,
		value,
		isFocused = false,
		placeholder: placeholderText = 'Enter code...'
	} = $props();

	const dispatch = createEventDispatcher<{
		SourceValueChange: SourceValueChangeEvent;
		run: { id: string };
	}>();

	let editorContainer: HTMLDivElement;
	let editorView: EditorView;
	let newValue = value;
	let currentKind = kind;

	// Language configuration based on cell type
	const getLanguageSupport = () => {
		switch (kind) {
			case 'js':
				return javascript();
			case 'md':
				return markdown();
			case 'html':
				return html();
			default:
				return javascript();
		}
	};

	// Custom theme to remove CodeMirror's default focus border and set background
	const customTheme = EditorView.theme({
		'&.cm-focused': {
			outline: 'none !important'
		},
		'.cm-editor': {
			outline: 'none !important',
			backgroundColor: '#e5e7eb !important' // bg-gray-200 (lighter)
		},
		'.cm-editor.cm-focused': {
			outline: 'none !important'
		},
		'.cm-content': {
			backgroundColor: '#e5e7eb !important', // bg-gray-200 (lighter)
			color: '#1f2937 !important' // text-gray-800 for better contrast
		},
		'.cm-line': {
			backgroundColor: '#e5e7eb !important' // bg-gray-200 (lighter)
		}
	});

	// Create editor state
	function createEditorState() {
		return EditorState.create({
			doc: value,
			extensions: [
				getLanguageSupport(),
				placeholder(placeholderText),
				syntaxHighlighting(defaultHighlightStyle),
				customTheme,
				keymap.of([
					{
						key: 'Ctrl-Enter',
						run: () => {
							dispatch('run', { id });
							return true;
						}
					},
					{
						key: 'Cmd-Enter',
						run: () => {
							dispatch('run', { id });
							return true;
						}
					},
					{
						key: 'Shift-Enter',
						run: () => {
							dispatch('run', { id });
							return true;
						}
					},
					{
						key: 'Enter',
						run: (view) => {
							const { state } = view;
							const { selection } = state;
							const line = state.doc.lineAt(selection.main.head);

							// Get the indentation of the current line
							const indentMatch = line.text.match(/^\s*/);
							const currentIndent = indentMatch ? indentMatch[0] : '';

							// Insert newline with the same indentation
							const insertText = '\n' + currentIndent;

							view.dispatch({
								changes: {
									from: selection.main.head,
									insert: insertText
								},
								selection: {
									anchor: selection.main.head + insertText.length
								}
							});
							return true;
						}
					}
				]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						newValue = update.state.doc.toString();
					}
				}),
				EditorView.focusChangeEffect.of((state, focused) => {
					if (!focused && newValue !== value) {
						value = newValue;
						dispatch('SourceValueChange', { id, value: newValue });
					}

					return null;
				})
			]
		});
	}

	function handleRunClick() {
		dispatch('run', { id });
	}

	onMount(() => {
		if (editorContainer) {
			editorView = new EditorView({
				state: createEditorState(),
				parent: editorContainer
			});
		}
	});

	onDestroy(() => {
		if (editorView) {
			editorView.destroy();
		}
	});

	// Update editor when value changes (only if not user-initiated)
	$effect(() => {
		if (editorView && value !== editorView.state.doc.toString()) {
			// Only update if the change didn't come from user input
			const currentDoc = editorView.state.doc.toString();
			if (value !== currentDoc) {
				editorView.dispatch({
					changes: {
						from: 0,
						to: editorView.state.doc.length,
						insert: value
					}
				});
			}
		}
	});

	// Update language when kind changes (only if actually changed)
	$effect(() => {
		if (editorView && kind !== currentKind) {
			currentKind = kind;
			editorView.destroy();
			editorView = new EditorView({
				state: createEditorState(),
				parent: editorContainer
			});
		}
	});
</script>

<div data-testid="cell-editor" class="relative w-full">
	<!-- Editor Container -->
	<div
		bind:this={editorContainer}
		class="rounded bg-gray-400 p-3 font-mono text-sm leading-relaxed min-h-[60px] w-full resize-none transition-all duration-150 outline-none border-0 border-none"
		class:ring-2={isFocused}
		class:ring-blue-500={isFocused}
		role="textbox"
		aria-label="Cell editor"
		data-placeholder={placeholderText}
	></div>

	<!-- Top-Right Run Icon -->
	{#if isFocused}
		<button
			class="top-2 right-2 h-6 w-6 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 absolute flex items-center justify-center rounded-full opacity-0 transition-all duration-150 group-hover:opacity-100"
			onclick={handleRunClick}
			aria-label="Run cell"
			title="Run cell (Ctrl+Enter)"
		>
			<Play size={12} />
		</button>
	{/if}
</div>
