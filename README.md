# Notebook - ObservableHQ Clone

A modern, interactive notebook application for source code, built with SvelteKit and TypeScript. This project is an ObservableHQ clone that provides a seamless coding experience with real-time code execution and beautiful output rendering.

## Features

- **Multi-language Support**: JavaScript, HTML, and Markdown cells
- **Real-time Code Execution**: Execute code and see results instantly
- **Interactive UI**: Clean, modern interface with smooth animations
- **Cell Management**: Add, edit, and delete cells with ease
- **Type Switching**: Convert between different cell types (JS, HTML, MD)
- **Responsive Design**: Works beautifully on desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) with Svelte 5
- **Language**: TypeScript
- **Styling**: CSS Custom Properties with utility classes
- **Code Editor**: [CodeMirror 6](https://codemirror.net/) with syntax highlighting
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **Testing**: Vitest with Testing Library
- **Linting**: ESLint + Prettier
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd notebook
```

2. Install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

This will start the server at `http://localhost:5173`. The app will automatically reload when you make changes.

For development with type checking:

```bash
npm run dev:check
```

### Building for Production

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test:unit` - Run unit tests
- `npm run test:unit:watch` - Run unit tests in watch mode
- `npm run test:unit:coverage` - Run tests with coverage
- `npm run lint` - Run linting
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run check` - Type check with svelte-check
- `npm run clean` - Clean build artifacts

## Project Structure

```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── popup/          # Popup menu components
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── routes/                 # SvelteKit routes
├── app.css                 # Global styles and design tokens
└── app.html               # HTML template
```

## Key Components

- **NotebookEditor**: Main notebook interface
- **CellEditor**: CodeMirror-based code editor
- **RenderedCell**: Output display component
- **SourceCell**: Source code cell component
- **CellMenu**: Cell action menu
- **AddCellBetween**: Cell insertion component

## Design System

The project uses a comprehensive design system with CSS custom properties for:

- Colors (semantic and functional)
- Spacing (4px base scale)
- Typography (font families, sizes, weights)
- Shadows and borders
- Transitions and animations

## Testing

The project follows a test-first development approach:

- **Unit Tests**: Vitest with Testing Library
- **Component Tests**: Isolated component testing
- **Accessibility Tests**: ARIA compliance verification

Run tests:

```bash
npm run test:unit
```

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Ensure accessibility compliance
4. Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using SvelteKit and modern web technologies.
