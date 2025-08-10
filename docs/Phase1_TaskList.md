# Phase 1 Task List: ObservableHQ Clone
## Visual & Interaction Parity (Experience First)

**Development Philosophy**: Test-First, Small Steps, Continuous Integration

---

## Development Setup & Infrastructure

### Task 1.1: Project Scaffolding
**Objective**: Set up SvelteKit project with all development tools

**Subtasks**:
1. **1.1.1**: Initialize SvelteKit project with TypeScript
   - Run: `npm create svelte@latest observablehq-clone -- --template skeleton --types typescript`
   - Verify TypeScript strict mode in `tsconfig.json`
   - **Test**: Verify project builds without errors

2. **1.1.2**: Install and configure Tailwind CSS
   - Install: `npm install -D tailwindcss postcss autoprefixer`
   - Run: `npx tailwindcss init -p`
   - Configure `tailwind.config.js` with content paths
   - **Test**: Verify Tailwind classes work in `+page.svelte`

3. **1.1.3**: Install core dependencies
   - Install: `npm install lucide-svelte @codemirror/view @codemirror/state @codemirror/commands @codemirror/language @codemirror/language-javascript @codemirror/language-markdown @codemirror/language-html`
   - **Test**: Verify all packages install without conflicts

4. **1.1.4**: Set up ESLint and Prettier
   - Install: `npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-svelte prettier prettier-plugin-svelte`
   - Create `.eslintrc.js` with SvelteKit + TypeScript rules
   - Create `.prettierrc` with consistent formatting
   - **Test**: Run `npm run lint` and `npm run format`

5. **1.1.5**: Configure Vite for development
   - Update `vite.config.ts` with proper aliases
   - Configure dev server settings
   - **Test**: Verify `npm run dev` starts without errors

### Task 1.2: Testing Infrastructure
**Objective**: Set up comprehensive testing framework

**Subtasks**:
1. **1.2.1**: Install testing dependencies
   - Install: `npm install -D vitest @testing-library/svelte @testing-library/jest-dom jsdom`
   - Install: `npm install -D @playwright/test`
   - **Test**: Verify all testing packages install correctly

2. **1.2.2**: Configure Vitest for unit testing
   - Create `vitest.config.ts` with SvelteKit setup
   - Configure test environment with jsdom
   - **Test**: Run `npm run test` and verify setup

3. **1.2.3**: Configure Playwright for UI testing
   - Run: `npx playwright install`
   - Create `playwright.config.ts` with proper settings
   - Configure test directories and patterns
   - **Test**: Run `npx playwright test --help`

4. **1.2.4**: Set up GitHub Actions workflow
   - Create `.github/workflows/ci.yml`
   - Configure lint, test, and build steps
   - Set up Playwright CI with proper caching
   - **Test**: Push to GitHub and verify workflow runs

5. **1.2.5**: Create test utilities and helpers
   - Create `src/lib/test-utils.ts` with common test helpers
   - Create `tests/helpers/playwright-helpers.ts` for UI test utilities
   - **Test**: Verify test utilities can be imported and used

### Task 1.3: Development Environment
**Objective**: Set up local development with proper tooling

**Subtasks**:
1. **1.3.1**: Configure Cursor ruleset
   - Create `.cursorrules` file with project-specific rules
   - Include TypeScript, SvelteKit, and testing conventions
   - **Test**: Verify Cursor recognizes and applies rules

2. **1.3.2**: Set up pre-commit hooks
   - Install: `npm install -D husky lint-staged`
   - Configure pre-commit to run lint and tests
   - **Test**: Make a commit and verify hooks run

3. **1.3.3**: Create development scripts
   - Add scripts to `package.json` for common tasks
   - Include watch modes for tests and linting
   - **Test**: Verify all scripts run without errors

---

## Core Layout Components

### Task 2.1: TopBar Component
**Objective**: Create the top menu bar with document title and actions

**Subtasks**:
1. **2.1.1**: Create TopBar component structure
   - Create `src/lib/components/TopBar.svelte`
   - Add basic layout with title area and actions area
   - **Test**: Create `tests/components/TopBar.test.ts` - verify component renders

2. **2.1.2**: Add document title functionality
   - Implement editable title with click-to-edit
   - Add title validation and sanitization
   - **Test**: Test title editing functionality in `tests/components/TopBar.test.ts`

3. **2.1.3**: Add metadata display
   - Show last edited timestamp
   - Display version number
   - **Test**: Test metadata rendering and updates

4. **2.1.4**: Add document actions
   - Implement share, duplicate, download buttons
   - Add proper hover states and icons
   - **Test**: Test button interactions in `tests/components/TopBar.test.ts`

5. **2.1.5**: Add responsive design
   - Handle mobile layout with hamburger menu
   - Test different screen sizes
   - **Test**: Create `tests/ui/topbar-responsive.spec.ts` with Playwright

### Task 2.2: FooterBar Component
**Objective**: Create persistent bottom action bar

**Subtasks**:
1. **2.2.1**: Create FooterBar component structure
   - Create `src/lib/components/FooterBar.svelte`
   - Add basic layout with action buttons
   - **Test**: Create `tests/components/FooterBar.test.ts` - verify component renders

2. **2.2.2**: Add cell management actions
   - Implement "Add Cell" button with type selector
   - Add "Run All" functionality
   - **Test**: Test button interactions and type selection

3. **2.2.3**: Add settings and view options
   - Implement settings toggle
   - Add view mode switcher
   - **Test**: Test settings panel interactions

4. **2.2.4**: Add keyboard shortcuts
   - Implement keyboard shortcuts for common actions
   - Add visual feedback for shortcuts
   - **Test**: Test keyboard interactions in `tests/ui/footer-keyboard.spec.ts`

5. **2.2.5**: Add responsive design
   - Handle mobile layout with collapsible actions
   - Test touch interactions
   - **Test**: Create `tests/ui/footer-responsive.spec.ts` with Playwright

### Task 2.3: LeftRail Component
**Objective**: Create collapsible left sidebar with outline and inputs

**Subtasks**:
1. **2.3.1**: Create LeftRail component structure
   - Create `src/lib/components/LeftRail.svelte`
   - Add collapsible sidebar layout
   - **Test**: Create `tests/components/LeftRail.test.ts` - verify component renders

2. **2.3.2**: Add outline panel
   - Display cell structure in tree format
   - Add click-to-navigate functionality
   - **Test**: Test outline navigation and tree rendering

3. **2.3.3**: Add inputs list
   - Show interactive inputs in sidebar
   - Add input type indicators
   - **Test**: Test inputs list rendering and interactions

4. **2.3.4**: Add search functionality
   - Implement search across notebook content
   - Add search result highlighting
   - **Test**: Test search functionality in `tests/ui/leftrail-search.spec.ts`

5. **2.3.5**: Add collapse/expand animations
   - Implement smooth sidebar animations
   - Add keyboard shortcuts for toggle
   - **Test**: Test animations and keyboard shortcuts

---

## Cell System Components

### Task 3.1: CellShell Component
**Objective**: Create cell wrapper with gutters and focus states

**Subtasks**:
1. **3.1.1**: Create CellShell component structure
   - Create `src/lib/components/CellShell.svelte`
   - Add basic cell layout with left gutter
   - **Test**: Create `tests/components/CellShell.test.ts` - verify component renders

2. **3.1.2**: Add left gutter with focus highlight
   - Implement soft grey focus bar on far-left
   - Add fade in/out animations (120-160ms)
   - **Test**: Test focus states and animations in `tests/ui/cellshell-focus.spec.ts`

3. **3.1.3**: Add left gutter icons
   - Implement drag handle, pin, type icon, kebab menu
   - Add proper hover states and interactions
   - **Test**: Test gutter icon interactions

4. **3.1.4**: Add right-edge context icons
   - Implement collapse, comment, error indicators
   - Add contextual visibility logic
   - **Test**: Test right-edge icon visibility and interactions

5. **3.1.5**: Add pinned/collapsed visuals
   - Implement visual states for pinned cells
   - Add collapsed cell animations
   - **Test**: Test pinned and collapsed states

### Task 3.2: CellEditor Component
**Objective**: Create auto-resizing editor with CodeMirror 6

**Subtasks**:
1. **3.2.1**: Create CellEditor component structure
   - Create `src/lib/components/CellEditor.svelte`
   - Set up basic CodeMirror 6 integration
   - **Test**: Create `tests/components/CellEditor.test.ts` - verify component renders

2. **3.2.2**: Implement auto-resize functionality
   - Configure CodeMirror to grow with content
   - Remove inner scrollbars
   - **Test**: Test auto-resize behavior in `tests/ui/celleditor-resize.spec.ts`

3. **3.2.3**: Add syntax highlighting
   - Configure JavaScript, Markdown, HTML languages
   - Add proper theme integration
   - **Test**: Test syntax highlighting for each language

4. **3.2.4**: Add top-right run icon
   - Implement discreet circular button
   - Add hover/focus reveal animations
   - **Test**: Test run button visibility and interactions

5. **3.2.5**: Add inline type switcher
   - Implement compact type selector
   - Add smooth transition animations
   - **Test**: Test type switching functionality

### Task 3.3: CellMenu Component
**Objective**: Create kebab menu with cell actions

**Subtasks**:
1. **3.3.1**: Create CellMenu component structure
   - Create `src/lib/components/CellMenu.svelte`
   - Add kebab menu trigger and popup
   - **Test**: Create `tests/components/CellMenu.test.ts` - verify component renders

2. **3.3.2**: Add cell actions menu items
   - Implement Pin/Unpin, Add comment, Select, Duplicate
   - Add Copy link, Embed, Download PNG, Delete
   - **Test**: Test each menu item interaction

3. **3.3.3**: Add keyboard navigation
   - Implement arrow key navigation
   - Add Enter/Space activation
   - **Test**: Test keyboard navigation in `tests/ui/cellmenu-keyboard.spec.ts`

4. **3.3.4**: Add accessibility features
   - Add ARIA labels and descriptions
   - Implement focus management
   - **Test**: Test accessibility with screen reader

5. **3.3.5**: Add click-outside-to-close
   - Implement proper event handling
   - Add escape key to close
   - **Test**: Test menu closing behavior

### Task 3.4: AddCellBetween Component
**Objective**: Create "+" affordances between cells

**Subtasks**:
1. **3.4.1**: Create AddCellBetween component structure
   - Create `src/lib/components/AddCellBetween.svelte`
   - Add "+ above / + below" buttons
   - **Test**: Create `tests/components/AddCellBetween.test.ts` - verify component renders

2. **3.4.2**: Add hover/focus reveal logic
   - Implement buttons that appear on hover/focus
   - Add large hit areas (≥32×32px)
   - **Test**: Test reveal behavior in `tests/ui/addcell-reveal.spec.ts`

3. **3.4.3**: Add type chooser popup
   - Implement type selection after insertion
   - Add JavaScript/Markdown/HTML options
   - **Test**: Test type selection functionality

4. **3.4.4**: Add keyboard accessibility
   - Implement keyboard navigation between cells
   - Add keyboard shortcuts for adding cells
   - **Test**: Test keyboard interactions

5. **3.4.5**: Add smooth animations
   - Implement reveal/hide animations
   - Add type chooser transitions
   - **Test**: Test animation timing and smoothness

### Task 3.5: OutputPanel Component
**Objective**: Create output display above editor

**Subtasks**:
1. **3.5.1**: Create OutputPanel component structure
   - Create `src/lib/components/OutputPanel.svelte`
   - Add output container above editor
   - **Test**: Create `tests/components/OutputPanel.test.ts` - verify component renders

2. **3.5.2**: Add output rendering
   - Implement clean output block with subtle border
   - Add proper padding and spacing
   - **Test**: Test output rendering with mock data

3. **3.5.3**: Add error display
   - Implement gently tinted error panels
   - Add monospaced stack traces
   - **Test**: Test error display formatting

4. **3.5.4**: Add value/DOM/chart display
   - Implement white surface for different output types
   - Add proper content sanitization
   - **Test**: Test different output type rendering

5. **3.5.5**: Maintain vertical rhythm
   - Ensure consistent spacing with editor
   - Add proper transitions between states
   - **Test**: Test spacing consistency

---

## Integration & Polish

### Task 4.1: Main Editor Page
**Objective**: Integrate all components into main editor interface

**Subtasks**:
1. **4.1.1**: Create main editor layout
   - Create `src/routes/n/[id]/+page.svelte`
   - Integrate TopBar, LeftRail, CellShell, FooterBar
   - **Test**: Create `tests/pages/editor.test.ts` - verify page renders

2. **4.1.2**: Add cell management logic
   - Implement cell ordering and state management
   - Add cell focus and selection logic
   - **Test**: Test cell management functionality

3. **4.1.3**: Add responsive layout
   - Handle different screen sizes
   - Implement mobile-friendly interactions
   - **Test**: Create `tests/ui/editor-responsive.spec.ts` with Playwright

4. **4.1.4**: Add keyboard shortcuts
   - Implement global keyboard shortcuts
   - Add shortcuts help modal
   - **Test**: Test keyboard shortcuts in `tests/ui/editor-keyboard.spec.ts`

5. **4.1.5**: Add smooth scrolling
   - Implement smooth cell navigation
   - Add scroll-to-cell functionality
   - **Test**: Test scrolling behavior

### Task 4.2: ShortcutsHelp Modal
**Objective**: Create keyboard shortcuts help modal

**Subtasks**:
1. **4.2.1**: Create ShortcutsHelp component
   - Create `src/lib/components/ShortcutsHelp.svelte`
   - Add modal with shortcuts list
   - **Test**: Create `tests/components/ShortcutsHelp.test.ts` - verify component renders

2. **4.2.2**: Add shortcuts documentation
   - Document all keyboard shortcuts
   - Add visual key representations
   - **Test**: Test shortcuts documentation accuracy

3. **4.2.3**: Add modal interactions
   - Implement open/close with "?" key
   - Add click-outside-to-close
   - **Test**: Test modal interactions in `tests/ui/shortcuts-modal.spec.ts`

4. **4.2.4**: Add accessibility
   - Implement proper focus management
   - Add ARIA attributes
   - **Test**: Test accessibility features

5. **4.2.5**: Add responsive design
   - Handle mobile layout
   - Test touch interactions
   - **Test**: Test responsive behavior

### Task 4.3: Visual Polish & Animations
**Objective**: Polish visual details and animations

**Subtasks**:
1. **4.3.1**: Refine spacing and typography
   - Ensure consistent 4/8px spacing scale
   - Verify typography hierarchy
   - **Test**: Test spacing consistency across components

2. **4.3.2**: Add micro-animations
   - Implement 120-200ms animations for menus
   - Add cell focus highlight animations
   - **Test**: Test animation timing and smoothness

3. **4.3.3**: Add shadows and elevation
   - Implement soft shadows (md/lg)
   - Add rounded corners (xl/2xl)
   - **Test**: Test visual depth and elevation

4. **4.3.4**: Add hover/focus states
   - Implement consistent hover states
   - Add focus indicators
   - **Test**: Test hover and focus interactions

5. **4.3.5**: Add loading states
   - Implement loading indicators
   - Add skeleton screens
   - **Test**: Test loading state behavior

### Task 4.4: Cross-Browser Testing
**Objective**: Ensure compatibility across browsers

**Subtasks**:
1. **4.4.1**: Test in Chrome
   - Run Playwright tests in Chrome
   - Verify all interactions work
   - **Test**: Create `tests/browser/chrome.spec.ts`

2. **4.4.2**: Test in Firefox
   - Run Playwright tests in Firefox
   - Verify compatibility
   - **Test**: Create `tests/browser/firefox.spec.ts`

3. **4.4.3**: Test in Safari
   - Run Playwright tests in Safari
   - Verify Safari-specific behavior
   - **Test**: Create `tests/browser/safari.spec.ts`

4. **4.4.4**: Test mobile browsers
   - Test on mobile Chrome and Safari
   - Verify touch interactions
   - **Test**: Create `tests/browser/mobile.spec.ts`

5. **4.4.5**: Fix cross-browser issues
   - Address any compatibility issues
   - Add polyfills if needed
   - **Test**: Verify fixes work across all browsers

---

## Final Integration & Testing

### Task 5.1: End-to-End Testing
**Objective**: Comprehensive testing of complete user workflows

**Subtasks**:
1. **5.1.1**: Create notebook creation workflow test
   - Test creating new notebook
   - Test adding first cell
   - **Test**: Create `tests/e2e/create-notebook.spec.ts`

2. **5.1.2**: Create cell editing workflow test
   - Test adding multiple cells
   - Test editing cell content
   - **Test**: Create `tests/e2e/edit-cells.spec.ts`

3. **5.1.3**: Create cell management workflow test
   - Test pinning/unpinning cells
   - Test collapsing/expanding cells
   - **Test**: Create `tests/e2e/manage-cells.spec.ts`

4. **5.1.4**: Create keyboard navigation workflow test
   - Test keyboard shortcuts
   - Test keyboard navigation between cells
   - **Test**: Create `tests/e2e/keyboard-navigation.spec.ts`

5. **5.1.5**: Create responsive workflow test
   - Test mobile interactions
   - Test tablet interactions
   - **Test**: Create `tests/e2e/responsive-workflow.spec.ts`

### Task 5.2: Performance Testing
**Objective**: Ensure performance meets requirements

**Subtasks**:
1. **5.2.1**: Test initial load performance
   - Measure time to interactive
   - Test on 3G connection simulation
   - **Test**: Create `tests/performance/load-time.spec.ts`

2. **5.2.2**: Test animation performance
   - Verify 60fps animations
   - Test smooth scrolling
   - **Test**: Create `tests/performance/animations.spec.ts`

3. **5.2.3**: Test memory usage
   - Monitor memory with many cells
   - Test garbage collection
   - **Test**: Create `tests/performance/memory.spec.ts`

4. **5.2.4**: Test editor performance
   - Test with large code blocks
   - Test auto-resize performance
   - **Test**: Create `tests/performance/editor.spec.ts`

5. **5.2.5**: Optimize performance issues
   - Address any performance bottlenecks
   - Add performance monitoring
   - **Test**: Verify optimizations work

### Task 5.3: Accessibility Testing
**Objective**: Ensure full accessibility compliance

**Subtasks**:
1. **5.3.1**: Test keyboard navigation
   - Verify all elements are keyboard accessible
   - Test focus management
   - **Test**: Create `tests/accessibility/keyboard.spec.ts`

2. **5.3.2**: Test screen reader compatibility
   - Test with NVDA/JAWS
   - Verify ARIA labels
   - **Test**: Create `tests/accessibility/screen-reader.spec.ts`

3. **5.3.3**: Test color contrast
   - Verify WCAG AA compliance
   - Test with color blindness simulators
   - **Test**: Create `tests/accessibility/contrast.spec.ts`

4. **5.3.4**: Test focus indicators
   - Verify visible focus states
   - Test focus trapping in modals
   - **Test**: Create `tests/accessibility/focus.spec.ts`

5. **5.3.5**: Fix accessibility issues
   - Address any accessibility problems
   - Add missing ARIA attributes
   - **Test**: Verify all accessibility issues are resolved

### Task 5.4: Documentation & Deployment
**Objective**: Prepare for deployment and documentation

**Subtasks**:
1. **5.4.1**: Create component documentation
   - Document all component APIs
   - Add usage examples
   - **Test**: Verify documentation accuracy

2. **5.4.2**: Create deployment configuration
   - Set up production build
   - Configure deployment pipeline
   - **Test**: Test production build process

3. **5.4.3**: Create user documentation
   - Write user guide
   - Add keyboard shortcuts reference
   - **Test**: Verify documentation completeness

4. **5.4.4**: Create developer documentation
   - Document development setup
   - Add contribution guidelines
   - **Test**: Verify setup instructions work

5. **5.4.5**: Final testing and validation
   - Run complete test suite
   - Verify all acceptance criteria
   - **Test**: Ensure all tests pass

---

## Cursor Ruleset

```yaml
# .cursorrules
name: ObservableHQ Clone Development
description: Development rules for ObservableHQ clone with SvelteKit, TypeScript, and test-first approach

# Code Style
style:
  - Use TypeScript strict mode for all files
  - Follow SvelteKit conventions and best practices
  - Use Tailwind CSS for styling with consistent spacing (4/8px scale)
  - Prefer functional components with clear separation of concerns
  - Use descriptive variable and function names
  - Add JSDoc comments for complex functions

# Testing Requirements
testing:
  - Write unit tests for all components before implementation (TDD)
  - Create Playwright UI tests for all user interactions
  - Keep tests small and focused on single features
  - Use descriptive test names that explain the behavior
  - Mock external dependencies in unit tests
  - Test accessibility features in UI tests

# Component Structure
components:
  - Place all components in src/lib/components/
  - Use PascalCase for component names
  - Export components as default exports
  - Include TypeScript interfaces for props
  - Add proper accessibility attributes (ARIA labels, roles)
  - Implement keyboard navigation for all interactive elements

# File Organization
structure:
  - Keep related files close together
  - Use consistent file naming conventions
  - Group tests with their components
  - Separate UI tests from unit tests
  - Use barrel exports for clean imports

# Performance
performance:
  - Optimize for 60fps animations
  - Use efficient re-rendering with Svelte reactivity
  - Lazy load components when possible
  - Minimize bundle size with code splitting
  - Test performance with large datasets

# Accessibility
accessibility:
  - Ensure keyboard navigation works for all elements
  - Add proper focus management
  - Use semantic HTML elements
  - Provide alternative text for images
  - Test with screen readers
  - Maintain WCAG AA color contrast

# Git Workflow
git:
  - Write descriptive commit messages
  - Keep commits small and focused
  - Test before committing
  - Use conventional commit format
  - Update documentation with code changes

# Error Handling
errors:
  - Add proper error boundaries
  - Provide user-friendly error messages
  - Log errors for debugging
  - Handle edge cases gracefully
  - Test error scenarios

# Security
security:
  - Sanitize user input
  - Use Content Security Policy
  - Validate all data
  - Avoid XSS vulnerabilities
  - Keep dependencies updated

# Documentation
documentation:
  - Document component APIs
  - Add inline comments for complex logic
  - Keep README updated
  - Document testing strategies
  - Provide usage examples
```

---

## Task Completion Checklist

### Development Setup (Tasks 1.1-1.3)
- [ ] SvelteKit project initialized with TypeScript
- [ ] Tailwind CSS configured
- [ ] Core dependencies installed
- [ ] ESLint and Prettier configured
- [ ] Vite configured for development
- [ ] Testing infrastructure set up (Vitest + Playwright)
- [ ] GitHub Actions workflow configured
- [ ] Test utilities and helpers created
- [ ] Cursor ruleset configured
- [ ] Pre-commit hooks set up
- [ ] Development scripts created

### Core Layout Components (Tasks 2.1-2.3)
- [ ] TopBar component with title and actions
- [ ] FooterBar component with cell management
- [ ] LeftRail component with outline and inputs
- [ ] All components have unit tests
- [ ] All components have UI tests
- [ ] Responsive design implemented
- [ ] Keyboard navigation working
- [ ] Accessibility features implemented

### Cell System Components (Tasks 3.1-3.5)
- [ ] CellShell with gutters and focus states
- [ ] CellEditor with CodeMirror 6 and auto-resize
- [ ] CellMenu with kebab actions
- [ ] AddCellBetween with "+" affordances
- [ ] OutputPanel with output display
- [ ] All components have unit tests
- [ ] All components have UI tests
- [ ] Animations and transitions working
- [ ] Keyboard shortcuts implemented

### Integration & Polish (Tasks 4.1-4.4)
- [ ] Main editor page integrated
- [ ] ShortcutsHelp modal implemented
- [ ] Visual polish and animations complete
- [ ] Cross-browser testing complete
- [ ] All integration tests passing
- [ ] Performance requirements met
- [ ] Accessibility compliance verified

### Final Testing (Tasks 5.1-5.4)
- [ ] End-to-end workflows tested
- [ ] Performance testing complete
- [ ] Accessibility testing complete
- [ ] Documentation created
- [ ] Deployment configuration ready
- [ ] All acceptance criteria met

---

**Total Estimated Tasks**: 85 subtasks  
**Estimated Timeline**: 4-6 weeks  
**Success Criteria**: All tasks completed with passing tests and visual parity with ObservableHQ
