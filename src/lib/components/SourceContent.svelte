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

	let {
		id,
		kind,
		value,
		isFocused = false,
		placeholder: placeholderText = 'Enter code...'
	} = $props();

	const dispatch = createEventDispatcher<{
		valueChange: { id: string; value: string };
		run: { id: string };
		focus: { id: string };
		blur: { id: string };
	}>();

	let editorContainer: HTMLDivElement;
	let editorView: EditorView;

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
		},
		// CodeMirror 6 syntax highlighting selectors
		'& .cm-keyword': {
			color: '#dc2626 !important' // text-red-600
		},
		'& .cm-operator': {
			color: '#1f2937 !important' // text-gray-800
		},
		'& .cm-string': {
			color: '#059669 !important' // text-emerald-600
		},
		'& .cm-string-2': {
			color: '#059669 !important' // text-emerald-600
		},
		'& .cm-comment': {
			color: '#6b7280 !important' // text-gray-500
		},
		'& .cm-number': {
			color: '#7c3aed !important' // text-violet-600
		},
		'& .cm-variable': {
			color: '#1f2937 !important' // text-gray-800
		},
		'& .cm-variable-2': {
			color: '#1f2937 !important' // text-gray-800
		},
		'& .cm-property': {
			color: '#1f2937 !important' // text-gray-800
		},
		'& .cm-definition': {
			color: '#2563eb !important' // text-blue-600
		},
		'& .cm-function': {
			color: '#2563eb !important' // text-blue-600
		},
		'& .cm-tag': {
			color: '#dc2626 !important' // text-red-600
		},
		'& .cm-attribute': {
			color: '#059669 !important' // text-emerald-600
		},
		'& .cm-builtin': {
			color: '#2563eb !important' // text-blue-600
		},
		'& .cm-typeName': {
			color: '#dc2626 !important' // text-red-600
		},
		'& .cm-meta': {
			color: '#6b7280 !important' // text-gray-500
		},
		'& .cm-qualifier': {
			color: '#1f2937 !important' // text-gray-800
		},
		'& .cm-punctuation': {
			color: '#1f2937 !important' // text-gray-800
		},
		'& .cm-propertyName': {
			color: '#1f2937 !important' // text-gray-800
		},
		'& .cm-variableName': {
			color: '#1f2937 !important' // text-gray-800
		},
		'& .cm-definitionName': {
			color: '#2563eb !important' // text-blue-600
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
					}
				]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						dispatch('valueChange', { id, value: newValue });
					}
				}),
				EditorView.focusChangeEffect.of((state, focused) => {
					if (focused) {
						dispatch('focus', { id });
					} else {
						dispatch('blur', { id });
					}
					return null;
				})
			]
		});
	}

	function handleRunClick() {
		dispatch('run', { id });
	}

	function handleKeyDown(event: KeyboardEvent) {
		// if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
		// 	event.preventDefault();
		// 	handleRunClick();
		// }
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

	// Update editor when value changes
	$effect(() => {
		if (editorView && value !== editorView.state.doc.toString()) {
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: value
				}
			});
		}
	});

	// Update language when kind changes
	$effect(() => {
		if (editorView) {
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
		tabindex="0"
		aria-label="Cell editor"
		data-placeholder={placeholderText}
		onkeydown={handleKeyDown}
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
