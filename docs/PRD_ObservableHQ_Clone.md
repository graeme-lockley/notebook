# Product Requirements Document: ObservableHQ Clone

## Interactive Notebook Editor with SvelteKit

**Document Version:** 1.0  
**Date:** December 2024  
**Project:** ObservableHQ-Exact Notebook Clone  
**Phase:** P1 - Visual & Interaction Parity (Experience First)

---

## 1. Executive Summary

### 1.1 Project Overview

We are building a pixel-perfect clone of ObservableHQ's interactive notebook editor using SvelteKit, TypeScript, and modern web technologies. The project follows a "look-and-feel first" approach, prioritizing visual fidelity and user experience before implementing reactive functionality.

### 1.2 Success Metrics

- **P1**: 95%+ visual parity with ObservableHQ reference images
- **P2**: All UI interactions respond with appropriate feedback
- **P3**: Reactive cell execution with dependency management
- **P4**: Full persistence and collaboration features

### 1.3 Target Users

- Data scientists and analysts familiar with ObservableHQ
- Developers building interactive documentation
- Educators creating live coding examples
- Anyone needing reactive, cell-based content creation

---

## 2. Product Vision & Strategy

### 2.1 Vision Statement

Create an ObservableHQ-compatible notebook editor that provides the same intuitive, reactive programming experience with modern web technologies and enhanced collaboration features.

### 2.2 Strategic Goals

1. **Immediate**: Achieve visual and interaction parity with ObservableHQ
2. **Short-term**: Implement reactive cell execution and dependency management
3. **Long-term**: Add advanced features like version control, real-time collaboration, and custom extensions

### 2.3 Competitive Analysis

- **ObservableHQ**: Primary reference and inspiration
- **Jupyter Notebooks**: Traditional notebook format
- **CodePen/JSFiddle**: Code playgrounds
- **Notion**: Document-based approach

---

## 3. User Experience Requirements

### 3.1 Core User Journey

1. **Landing**: User arrives at notebook list or creates new notebook
2. **Editing**: User interacts with cells (add, edit, run, organize)
3. **Execution**: Cells execute reactively based on dependencies
4. **Sharing**: User shares or exports their work
5. **Collaboration**: Multiple users can edit simultaneously

### 3.2 Key User Personas

#### Persona 1: Data Analyst (Primary)

- **Goals**: Create interactive data visualizations and analysis
- **Pain Points**: Need for reactive updates, easy sharing
- **Use Cases**: Building dashboards, exploratory data analysis

#### Persona 2: Developer (Secondary)

- **Goals**: Create interactive documentation and examples
- **Pain Points**: Need for code execution, dependency management
- **Use Cases**: API documentation, interactive tutorials

#### Persona 3: Educator (Tertiary)

- **Goals**: Create live coding examples and interactive lessons
- **Pain Points**: Need for real-time updates, student collaboration
- **Use Cases**: Programming courses, interactive textbooks

---

## 4. Functional Requirements

### 4.1 Phase 1: Visual & Interaction Parity (P1)

#### 4.1.1 Global Layout Components

**Top Menu Bar**

- Document title display and editing
- Metadata display (last edited, version)
- Document-level actions (share, duplicate, download)
- Minimalist, airy design with subtle elevation

**Left Gutter (Per Cell)**

- Individual left gutter attached to each cell
- Drag handle for cell reordering
- Pin/unpin functionality with visual feedback
- Cell type icon (JS/MD/HTML) with color coding
- Kebab menu for cell actions
- **Focused-cell grey highlight**: Soft grey bar spanning cell height when focused, fades on blur (120-160ms)

**LeftRail (Optional Sidebar)**

- Outline panel showing cell structure (collapsible)
- Inputs list for interactive controls
- Search functionality across notebook
- Collapsible sidebar with smooth animations

**Main Work Area**

- Stacked cells with consistent spacing
- **Output rendered ABOVE editor text** (key ObservableHQ pattern)
- **Left gutter attached to each cell** (not a global sidebar)
- Responsive layout adapting to screen size
- Smooth scrolling and navigation

**Footer Action Bar**

- Persistent bottom bar with global actions
- Add cell button with type selection
- Run all cells functionality
- Settings and view options
- Subtle elevation and consistent styling

#### 4.1.2 Cell Surface & Gutter System

**Auto-Resizing Editor**

- CodeMirror 6 integration with height synchronization
- No inner scrollbars - editor grows with content
- Syntax highlighting for JavaScript, Markdown, HTML
- Smooth resize animations (120-200ms)

**Left Gutter (Per Cell)**

- Individual left gutter attached to each cell (not a global sidebar)
- Drag handle for cell reordering
- Pin/unpin functionality with visual feedback
- Cell type icon (JS/MD/HTML) with color coding
- Kebab menu for cell actions
- **Focused-cell grey highlight**: Soft grey bar spanning cell height when focused, fades on blur (120-160ms)

**Right-Edge Context Icons**

- Contextual actions aligned to right edge
- Collapse/expand functionality
- Comment indicators
- Error/warning indicators
- Consistent 32-36px interactive targets

**Top-Right Run Icon**

- Discreet circular/ghost button within editor block
- Appears on hover/focus, aligns to editor's top-right corner
- Visible on focus, hidden when idle
- Smooth reveal/hide animations

#### 4.1.3 Menu System & Affordances

**Cell Action Menu (Kebab)**

- Pin/Unpin cell
- Add comment functionality
- Select cell for bulk operations
- Duplicate cell with dependencies
- Copy link to specific cell
- Embed functionality (placeholder)
- Download cell output as PNG
- Delete cell with confirmation

**Cell Type Switcher**

- Popup menu for JavaScript/Markdown/HTML selection
- Icon + label for each type
- Compact and elegant design
- Smooth transition animations

**Add Cell Affordances**

- "+" buttons between cells (above and below)
- Appear on hover/focus of gaps
- Large hit areas (≥32×32px)
- Keyboard accessible navigation
- Type chooser after insertion
- Smooth reveal animations

#### 4.1.4 Output & Display System

**Output Panel**

- Renders above editor in clean block
- Subtle top border and consistent padding
- White surface for values/DOM/charts
- Gently tinted error panels with monospaced stack traces
- Maintains vertical rhythm with editor

**Visual Feedback**

- Hover/focus cues reveal gutter controls
- Very light row tint on hover
- Consistent spacing and typography
- Smooth micro-animations throughout

### 4.2 Phase 2: Functional Stubs (P2)

- Wire all buttons/menus to no-op actions with console logging
- Provide mock outputs (e.g., "7", placeholder charts) for visual validation
- Persist UI-only state (selection, pinned/collapsed) to localStorage
- Implement keyboard shortcuts with visual feedback

### 4.3 Phase 3: Reactive Runtime & Dataflow (P3)

- Web Worker evaluator for cell execution
- Symbol export/usage detection for dependency DAG
- Topological re-run with cancellation (latest-wins)
- `viewof` semantics for interactive inputs
- Inline errors and per-cell console capture

### 4.4 Phase 4: Persistence, History, Multiplayer (P4)

- Event store integration for version control
- Real-time collaboration with presence indicators
- Comment system with threaded discussions
- Export/import functionality
- Advanced sharing and embedding options

---

## 5. Technical Requirements

### 5.1 Technology Stack

**Frontend Framework**

- SvelteKit with TypeScript (strict mode)
- Vite for build tooling and development
- Tailwind CSS for styling and design system

**Editor Integration**

- CodeMirror 6 (primary) with auto-resize
- Monaco Editor adapter (fallback option)
- Syntax highlighting for JavaScript, Markdown, HTML

**Icon System**

- Lucide icons (default, thin 2px stroke)
- Heroicons adapter (optional)
- Consistent 18-20px glyphs within 32-36px targets

**Additional Libraries**

- DOMPurify for HTML sanitization
- Web Workers for cell evaluation
- LocalStorage for UI state persistence

### 5.2 Architecture Components

**Core Components**

1. `TopBar` - Document title, metadata, actions
2. `CellShell` - Wrapper with left gutter (per cell) and focus states
3. `CellEditor` - CodeMirror integration with run button
4. `CellMenu` - Kebab popup with actions
5. `AddCellBetween` - "+" affordances with type chooser
6. `OutputPanel` - Results display above editor
7. `FooterBar` - Global action bar
8. `ShortcutsHelp` - Keyboard shortcuts modal

**Data Models**

```typescript
type CellKind = 'js' | 'md' | 'html' | 'input';
type InputKind = 'slider' | 'number' | 'text' | 'select' | 'checkbox' | 'toggle' | 'color' | 'date';

interface Notebook {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
	version: number;
	cellOrder: string[];
}

interface Cell {
	id: string;
	kind: CellKind;
	source: string;
	meta: {
		pinned?: boolean;
		collapsed?: boolean;
		name?: string;
	};
	deps: string[];
	exports: string[];
	lastRun?: {
		status: 'ok' | 'error' | 'pending';
		valueHtml?: string;
		error?: string;
		console?: string[];
	};
}
```

### 5.3 Routing Structure

- `/` - Notebook list and landing page
- `/n/[id]` - Main editor interface
- `/api/notebooks/*` - CRUD operations and data streams
- `/static/eval-worker.js` - Web Worker for cell evaluation

---

## 6. Design Requirements

### 6.1 Visual Design System

**Typography**

- Primary text: System font stack with fallbacks
- Monospace: JetBrains Mono or Fira Code for code
- Consistent line heights and spacing

**Color Palette**

- Primary: ObservableHQ brand colors
- Focus states: Soft grey highlights
- Error states: Gentle red tinting
- Success states: Subtle green indicators

**Spacing & Layout**

- 4/8px spacing scale throughout
- Consistent vertical rhythm
- Balanced whitespace and breathing room
- Responsive breakpoints for different screen sizes

**Shadows & Elevation**

- Soft shadows (md/lg) for depth
- Rounded corners (xl/2xl) for modern feel
- Subtle elevation for interactive elements

### 6.2 Animation & Motion

**Micro-Animations**

- Menu open/close: 120-200ms
- Cell focus highlight: 120-160ms
- "+" affordance reveal: 150ms
- Run button reveal: 100ms
- Pin/collapse transitions: 200ms

**Animation Curves**

- Ease-out for reveal animations
- Ease-in-out for state transitions
- Consistent timing across all interactions

### 6.3 Accessibility Requirements

- Keyboard navigation for all interactive elements
- Screen reader compatibility
- Focus indicators and states
- ARIA labels and descriptions
- Color contrast compliance (WCAG AA)

---

## 7. Performance Requirements

### 7.1 Performance Targets

- **Initial Load**: < 2 seconds on 3G connection
- **Cell Execution**: < 500ms for simple cells
- **Animation Performance**: 60fps smooth animations
- **Memory Usage**: < 100MB for typical notebooks

### 7.2 Optimization Strategies

- Code splitting for large components
- Lazy loading of editor components
- Efficient re-rendering with Svelte reactivity
- Web Worker isolation for cell execution
- Debounced auto-save functionality

---

## 8. Quality Assurance

### 8.1 Testing Strategy

**Unit Tests**

- Auto-resize functionality
- Menu accessibility
- Plus-affordance visibility
- Component rendering and interactions

**Integration Tests**

- Cell execution flow
- Dependency management
- State persistence
- Keyboard shortcuts

**End-to-End Tests**

- Complete user workflows
- Cross-browser compatibility
- Performance benchmarks
- Accessibility compliance

### 8.2 Code Quality Standards

- TypeScript strict mode enforcement
- ESLint configuration for code consistency
- Prettier for code formatting
- Husky for pre-commit hooks
- Comprehensive error handling

---

## 9. Implementation Roadmap

### 9.1 Phase 1: Foundation (Week 1-2)

**Week 1**

- Project scaffolding with SvelteKit + Tailwind
- Basic layout components (TopBar, FooterBar)
- CellShell with left gutter and focus states

**Week 2**

- CellEditor with CodeMirror integration
- Auto-resize functionality
- Top-right run icon implementation

### 9.2 Phase 2: Interactions (Week 3-4)

**Week 3**

- CellMenu (kebab) and type switcher
- AddCellBetween affordances
- OutputPanel with mock results

**Week 4**

- LeftRail implementation
- ShortcutsHelp modal
- Polish and refinement

### 9.3 Phase 3: Functionality (Week 5-6)

**Week 5**

- Web Worker cell evaluator
- Dependency detection and management
- Basic reactive updates

**Week 6**

- Error handling and console capture
- Input controls (slider, select, etc.)
- State persistence

### 9.4 Phase 4: Advanced Features (Week 7-8)

**Week 7**

- Event store integration
- Version control and history
- Export/import functionality

**Week 8**

- Real-time collaboration
- Advanced sharing features
- Performance optimization

---

## 10. Success Criteria & Acceptance

### 10.1 P1 Acceptance Criteria

- [ ] Visual parity with ObservableHQ reference images
- [ ] All UI components render correctly
- [ ] Smooth animations and transitions
- [ ] Responsive design across screen sizes
- [ ] Keyboard navigation works for all elements
- [ ] Accessibility compliance verified

### 10.2 P2 Acceptance Criteria

- [ ] All buttons and menus respond appropriately
- [ ] Mock outputs render consistently
- [ ] UI state persists across sessions
- [ ] Keyboard shortcuts provide visual feedback

### 10.3 P3 Acceptance Criteria

- [ ] Cells execute reactively based on dependencies
- [ ] Only impacted cells re-run on changes
- [ ] Interactive inputs drive dependent cells
- [ ] Errors display inline with proper formatting

### 10.4 P4 Acceptance Criteria

- [ ] Version history and restore functionality
- [ ] Real-time collaboration with presence
- [ ] Comment system with threading
- [ ] Advanced sharing and embedding

---

## 11. Risk Assessment & Mitigation

### 11.1 Technical Risks

**Risk**: CodeMirror 6 integration complexity
**Mitigation**: Start with basic integration, have Monaco fallback

**Risk**: Performance with large notebooks
**Mitigation**: Implement virtualization and efficient re-rendering

**Risk**: Browser compatibility issues
**Mitigation**: Test across major browsers, use progressive enhancement

### 11.2 Timeline Risks

**Risk**: Scope creep in visual refinement
**Mitigation**: Strict adherence to P1 requirements, defer enhancements

**Risk**: Complex dependency management
**Mitigation**: Start with simple cases, iterate on complexity

### 11.3 Quality Risks

**Risk**: Accessibility compliance gaps
**Mitigation**: Early accessibility testing, automated compliance checks

**Risk**: Performance degradation
**Mitigation**: Continuous performance monitoring, optimization sprints

---

## 12. Future Enhancements

### 12.1 Post-Launch Features

- Custom cell types and extensions
- Advanced visualization libraries
- Integration with external data sources
- Mobile-responsive design
- Offline functionality

### 12.2 Long-term Vision

- Plugin ecosystem
- Enterprise features (SSO, audit logs)
- Advanced collaboration tools
- AI-assisted code generation
- Integration with development workflows

---

## 13. Appendices

### 13.1 Reference Materials

- ObservableHQ reference images (FullPage.png, CellTypeMenu.png, HamburgerMenu.png)
- ObservableHQ documentation and API references
- CodeMirror 6 documentation and examples
- SvelteKit best practices and patterns

### 13.2 Technical Specifications

- Detailed component API documentation
- State management patterns
- Error handling strategies
- Performance optimization guidelines

### 13.3 Design Assets

- Icon library specifications
- Color palette and typography guide
- Component design tokens
- Animation timing and easing curves

---

**Document Status**: Draft  
**Next Review**: After P1 completion  
**Approval Required**: Product Owner, Technical Lead, Design Lead
