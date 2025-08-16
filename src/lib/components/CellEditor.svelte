<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { EditorView } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { keymap } from '@codemirror/view';
	import { placeholder } from '@codemirror/view';
	import { javascript } from '@codemirror/lang-javascript';
	import { markdown } from '@codemirror/lang-markdown';
	import { html } from '@codemirror/lang-html';
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

	// Create editor state
	function createEditorState() {
		return EditorState.create({
			doc: value,
			extensions: [
				getLanguageSupport(),
				placeholder(placeholderText),
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
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			handleRunClick();
		}
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
		data-testid="editor-container"
		bind:this={editorContainer}
		class="rounded border-gray-200 bg-white p-3 font-mono text-sm leading-relaxed min-h-[60px] w-full resize-none border transition-all duration-150 outline-none"
		class:ring-2={isFocused}
		class:ring-blue-500={isFocused}
		class:border-blue-500={isFocused}
		role="textbox"
		tabindex="0"
		aria-label="Cell editor"
		data-placeholder={placeholderText}
		onkeydown={handleKeyDown}
	></div>

	<!-- Top-Right Run Icon -->
	{#if isFocused}
		<button
			data-testid="run-button"
			class="top-2 right-2 h-6 w-6 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 absolute flex items-center justify-center rounded-full opacity-0 transition-all duration-150 group-hover:opacity-100"
			onclick={handleRunClick}
			aria-label="Run cell"
			title="Run cell (Ctrl+Enter)"
		>
			<Play size={12} />
		</button>
	{/if}
</div>
