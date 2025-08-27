# Observable Runtime Integration TODO

## Overview

This document outlines the step-by-step implementation plan for integrating Observable's reactive runtime system into the notebook project. The goal is to make cells reactive by design, with automatic execution and dependency tracking.

## Phase 1: Core Runtime Infrastructure

### 1.1 Create Reactive Cell Interface

**File**: `src/lib/types/cell.ts`
**Priority**: High
**Context**: Replace the current static Cell interface with a reactive one that includes Observable runtime integration.

**Actions**:

- [ ] Add Observable runtime imports: `import { Runtime, Inspector } from '@observablehq/runtime';`
- [ ] Add parser import: `import { parse } from '@observablehq/parser';`
- [ ] Create `CellValue` interface to store runtime results:
  ```typescript
  export interface CellValue {
  	value: any;
  	error: Error | null;
  	html?: string;
  	console?: string[];
  }
  ```
- [ ] Update `Cell` interface to include runtime methods:
  ```typescript
  export interface Cell {
  	// ... existing properties ...
  	result: CellValue; // Replace valueHtml with result
  	execute(): Promise<void>;
  	dispose(): void;
  	getValue(): any;
  	getError(): Error | null;
  	getHtml(): string | null;
  }
  ```

### 1.2 Implement ReactiveCell Class

**File**: `src/lib/types/cell.ts`
**Priority**: High
**Context**: Create a concrete implementation of the reactive Cell interface that integrates with Observable runtime.

**Actions**:

- [ ] Create `ReactiveCell` class that implements `Cell` interface
- [ ] Add private properties for runtime management:
  ```typescript
  private runtime: Runtime;
  private variable: any = null;
  private observers: Set<(cell: ReactiveCell) => void> = new Set();
  private notebook: ReactiveNotebook;
  ```
- [ ] Implement constructor that takes runtime and notebook references
- [ ] Add observer pattern methods: `addObserver()`, `removeObserver()`, `notifyObservers()`
- [ ] Implement `execute()` method with cell kind-specific logic
- [ ] Implement `dispose()` method for cleanup
- [ ] Add getter methods: `getValue()`, `getError()`, `getHtml()`

### 1.3 Implement Expression Parsing for Markdown/HTML

**File**: `src/lib/types/cell.ts`
**Priority**: High
**Context**: Enable embedded JavaScript expressions in markdown and HTML cells (e.g., `{data.length}`, `${mean}`).

**Actions**:

- [ ] Create `extractExpressions()` method to find `{expression}` and `${expression}` patterns
- [ ] Create `createExpressionEvaluator()` method to generate JavaScript code for expression evaluation
- [ ] Implement `renderMarkdown()` method for markdown-to-HTML conversion
- [ ] Update `executeMarkdown()` and `executeHtml()` methods to handle expressions
- [ ] Add error handling for invalid expressions
- [ ] Ensure expressions are evaluated in the context of other cells' variables

### 1.4 Implement ReactiveNotebook Class

**File**: `src/lib/types/cell.ts`
**Priority**: High
**Context**: Replace the current `Notebook` class with a reactive version that manages Observable runtime.

**Actions**:

- [ ] Create `ReactiveNotebook` class extending current functionality
- [ ] Add Observable runtime initialization in constructor:
  ```typescript
  private runtime: Runtime;
  private observers: Set<(notebook: ReactiveNotebook) => void> = new Set();
  ```
- [ ] Update `addCell()` method to create `ReactiveCell` instances
- [ ] Add observer pattern for notebook changes
- [ ] Update all cell management methods to work with reactive cells
- [ ] Implement proper cleanup in `dispose()` method
- [ ] Update serialization methods to handle reactive cell data

## Phase 2: Store Integration

### 2.1 Update Notebook Store Interface

**File**: `src/lib/stores/notebook.ts`
**Priority**: High
**Context**: Update the store to work with reactive notebooks and cells.

**Actions**:

- [ ] Update imports to use `ReactiveNotebook` and `ReactiveCell`
- [ ] Update `NotebookStore` interface to reflect reactive methods
- [ ] Add runtime-specific methods to interface:
  ```typescript
  runAllCells: () => Promise<void>;
  getCellValue: (id: string) => any;
  getCellError: (id: string) => Error | null;
  getCellStatus: (id: string) => 'pending' | 'ok' | 'error';
  ```
- [ ] Update method signatures to be async where needed

### 2.2 Implement Reactive Store

**File**: `src/lib/stores/notebook.ts`
**Priority**: High
**Context**: Create a store that properly integrates with the reactive notebook system.

**Actions**:

- [ ] Update `createNotebookStore()` to accept `ReactiveNotebook`
- [ ] Set up notebook observer to trigger store updates when cells change
- [ ] Update all wrapper methods to work with reactive notebook
- [ ] Add runtime-specific methods to store implementation
- [ ] Ensure proper error handling and async operation support

## Phase 3: Component Updates

### 3.1 Update RenderedContent Component

**File**: `src/lib/components/RenderedContent.svelte`
**Priority**: High
**Context**: Update the content renderer to display reactive cell results with proper error handling and loading states.

**Actions**:

- [ ] Update imports to use `ReactiveCell`
- [ ] Update Props interface to accept `ReactiveCell`
- [ ] Replace current rendering logic with reactive value extraction:
  ```typescript
  let { status, result } = $derived({
  	status: cell.status,
  	result: cell.result,
  	isClosed: cell.isClosed
  });
  ```
- [ ] Add loading state rendering for `status === 'pending'`
- [ ] Add error state rendering for `status === 'error'`
- [ ] Add proper value rendering for different result types
- [ ] Add styling for loading, error, and success states

### 3.2 Update RenderedCell Component

**File**: `src/lib/components/RenderedCell.svelte`
**Priority**: Medium
**Context**: Update the cell wrapper to pass reactive cell data to child components.

**Actions**:

- [ ] Update Props interface to use `ReactiveCell`
- [ ] Ensure proper prop passing to `RenderedContent`
- [ ] Update any cell-specific logic to work with reactive cells

### 3.3 Update NotebookEditor Component

**File**: `src/lib/components/NotebookEditor.svelte`
**Priority**: Medium
**Context**: Update the main editor to work with reactive notebooks and handle async operations.

**Actions**:

- [ ] Update imports to use reactive store types
- [ ] Update event handlers to be async where needed
- [ ] Add `onMount` lifecycle to run all cells on initialization
- [ ] Update cell creation and update handlers to work with reactive system

## Phase 4: Runtime Integration

### 4.1 Create Observable Value Renderer

**File**: `src/lib/components/ObservableValueRenderer.svelte`
**Priority**: Medium
**Context**: Create a specialized component for rendering Observable cell values including plots, tables, and other rich outputs.

**Actions**:

- [ ] Create new component file
- [ ] Import Observable packages: `@observablehq/plot`, `@observablehq/katex`, `@observablehq/graphviz`
- [ ] Implement value type detection and appropriate rendering
- [ ] Add support for Plot objects and HTML elements
- [ ] Add support for mathematical expressions with KaTeX
- [ ] Add support for Graphviz diagrams
- [ ] Implement proper error handling and fallback rendering

### 4.2 Integrate Observable Inputs

**File**: `src/lib/components/ObservableInputs.svelte`
**Priority**: Low
**Context**: Create components for interactive inputs that can be used in cells.

**Actions**:

- [ ] Create new component file
- [ ] Import `@observablehq/inputs`
- [ ] Implement various input types: text, number, range, select, checkbox
- [ ] Add proper event handling and value binding
- [ ] Ensure inputs work within the reactive system

## Phase 5: Testing and Validation

### 5.1 Create Runtime Tests

**File**: `src/lib/types/cell.test.ts`
**Priority**: Medium
**Context**: Add comprehensive tests for the reactive cell and notebook functionality.

**Actions**:

- [ ] Add tests for `ReactiveCell` execution
- [ ] Add tests for expression parsing in markdown/HTML
- [ ] Add tests for reactive dependencies between cells
- [ ] Add tests for error handling and recovery
- [ ] Add tests for cell disposal and cleanup

### 5.2 Create Integration Tests

**File**: `tests/integration/runtime.test.ts`
**Priority**: Medium
**Context**: Test the full integration of the reactive system with the UI components.

**Actions**:

- [ ] Test cell creation and execution flow
- [ ] Test reactive updates when dependencies change
- [ ] Test error propagation through the system
- [ ] Test markdown and HTML expression evaluation
- [ ] Test Plot and other Observable library integration

## Phase 6: Performance and Optimization

### 6.1 Implement Cell Execution Optimization

**File**: `src/lib/types/cell.ts`
**Priority**: Low
**Context**: Optimize cell execution to avoid unnecessary re-runs and improve performance.

**Actions**:

- [ ] Add dependency tracking to avoid unnecessary executions
- [ ] Implement execution batching for multiple cell updates
- [ ] Add execution caching for unchanged cells
- [ ] Optimize expression parsing and evaluation

### 6.2 Add Memory Management

**File**: `src/lib/types/cell.ts`
**Priority**: Low
**Context**: Ensure proper cleanup of Observable variables and prevent memory leaks.

**Actions**:

- [ ] Implement proper disposal of Observable variables
- [ ] Add cleanup on cell removal
- [ ] Add cleanup on notebook disposal
- [ ] Monitor memory usage and optimize as needed

## Phase 7: Documentation and Examples

### 7.1 Create Usage Examples

**File**: `docs/runtime-usage.md`
**Priority**: Low
**Context**: Document how to use the reactive runtime system with examples.

**Actions**:

- [ ] Create documentation for basic cell usage
- [ ] Add examples of markdown with expressions
- [ ] Add examples of HTML with expressions
- [ ] Add examples of Plot integration
- [ ] Add examples of input components

### 7.2 Update API Documentation

**File**: `docs/api.md`
**Priority**: Low
**Context**: Document the new reactive API and interfaces.

**Actions**:

- [ ] Document `ReactiveCell` interface and methods
- [ ] Document `ReactiveNotebook` interface and methods
- [ ] Document expression syntax for markdown/HTML
- [ ] Document integration with Observable libraries

## Implementation Notes

### Key Considerations:

1. **Backward Compatibility**: Ensure existing notebooks can be loaded and converted to reactive format
2. **Error Handling**: Implement comprehensive error handling for expression evaluation and cell execution
3. **Performance**: Monitor performance impact of reactive system and optimize as needed
4. **Testing**: Ensure comprehensive test coverage for all reactive functionality
5. **Documentation**: Keep documentation updated as the system evolves

### Dependencies:

- `@observablehq/runtime` - Core runtime functionality
- `@observablehq/parser` - JavaScript parsing
- `@observablehq/stdlib` - Standard library functions
- `@observablehq/plot` - Data visualization
- `@observablehq/inputs` - Interactive inputs
- `@observablehq/inspector` - Debugging tools
- `@observablehq/katex` - Mathematical expressions
- `@observablehq/graphviz` - Graph visualization

### Migration Strategy:

1. Implement reactive system alongside existing system
2. Add migration utilities to convert existing notebooks
3. Test thoroughly before switching over
4. Provide fallback for any issues during transition

## Success Criteria:

- [ ] Cells execute automatically when created or updated
- [ ] Markdown and HTML cells support embedded JavaScript expressions
- [ ] Reactive dependencies work correctly between cells
- [ ] Plot and other Observable libraries integrate seamlessly
- [ ] Error handling is robust and user-friendly
- [ ] Performance is acceptable for typical notebook sizes
- [ ] All existing functionality is preserved
- [ ] Comprehensive test coverage is in place
