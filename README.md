# Notebook - ObservableHQ Clone

A modern, interactive notebook application for source code, built with SvelteKit and TypeScript. This project is an ObservableHQ clone that provides a seamless coding experience with real-time code execution, beautiful output rendering, and user authentication.

## Features

- **Multi-language Support**: JavaScript, HTML, and Markdown cells
- **Real-time Code Execution**: Execute code and see results instantly
- **Interactive UI**: Clean, modern interface with smooth animations
- **Cell Management**: Add, edit, and delete cells with ease
- **Type Switching**: Convert between different cell types (JS, HTML, MD)
- **User Authentication**: Google OAuth integration with session management
- **Event Sourcing**: Complete audit trail of all notebook changes
- **Real-time Collaboration**: WebSocket-based live updates
- **Responsive Design**: Works beautifully on desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) with Svelte 5
- **Language**: TypeScript
- **Architecture**: Clean Architecture with Event Sourcing & CQRS
- **Authentication**: Google OAuth 2.0 with session management
- **Event Store**: Remote event store for persistence
- **Real-time**: WebSocket connections for live collaboration
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
- Event Store server (optional, for full functionality)

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

3. Set up environment variables (optional):

Create a `.env` file in the project root for full authentication features:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Session Configuration
SESSION_SECRET=your_session_secret

# Event Store Configuration
EVENT_STORE_URL=http://localhost:8000
EVENT_STORE_TIMEOUT=10000
EVENT_STORE_RETRIES=3
EVENT_STORE_RETRY_DELAY=1000
```

### Development

Start the development server:

```bash
npm run dev
```

This will start the server at `http://localhost:5173` (or the next available port). The app will automatically reload when you make changes.

**Note**: The application will run successfully even without the `.env` file, but with limited functionality (no authentication features).

For development with type checking:

```bash
npm run dev:check
```

## Authentication Setup

### Running Without Authentication

If you don't have Google OAuth credentials set up, the application will still run but with limited functionality:

- ✅ Core notebook functionality works
- ✅ All existing features work
- ❌ User authentication is disabled
- ❌ OAuth routes return errors
- ❌ Protected routes are not accessible

The application will log warnings about missing OAuth configuration but will continue to run.

### Getting Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client IDs
5. Set the authorized redirect URI to `http://localhost:5173/auth/google/callback`
6. Copy the Client ID and Client Secret to your `.env` file

### Development vs Production

- **Development**: Use `http://localhost:5173` for redirect URIs
- **Production**: Use your actual domain for redirect URIs
- **Session Secret**: Generate a secure random string for production

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
│   ├── server/             # Server-side code (Clean Architecture)
│   │   ├── domain/         # Domain layer (business logic)
│   │   │   ├── events/     # Domain events
│   │   │   ├── value-objects/ # Domain entities
│   │   │   └── domain-services/ # Business logic
│   │   ├── application/    # Application layer (use cases)
│   │   │   ├── command-handlers/ # Command handlers
│   │   │   ├── projectors/ # Event projectors
│   │   │   ├── services/   # Application services
│   │   │   ├── middleware/ # Authentication middleware
│   │   │   ├── ports/      # Interface definitions
│   │   │   └── adapters/   # Infrastructure implementations
│   │   └── websocket/      # WebSocket server
│   ├── client/             # Client-side code
│   │   ├── services/       # Client services
│   │   ├── stores/         # Svelte stores
│   │   └── utils/          # Client utilities
│   ├── types/              # TypeScript type definitions
│   └── common/             # Shared utilities
├── routes/                 # SvelteKit routes
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication routes
│   └── notebook/          # Notebook pages
├── app.css                # Global styles and design tokens
└── app.html              # HTML template
```

## Key Components

### Frontend Components

- **NotebookEditor**: Main notebook interface
- **CellEditor**: CodeMirror-based code editor
- **RenderedCell**: Output display component
- **SourceCell**: Source code cell component
- **CellMenu**: Cell action menu
- **AddCellBetween**: Cell insertion component

### Backend Services

- **AuthenticationService**: Google OAuth integration
- **SessionService**: User session management
- **NotebookCommandService**: Notebook operations
- **ProjectionManager**: Event sourcing projections
- **WebSocketService**: Real-time collaboration
- **AuthMiddleware**: Route protection and user context

## Design System

The project uses a comprehensive design system with CSS custom properties for:

- Colors (semantic and functional)
- Spacing (4px base scale)
- Typography (font families, sizes, weights)
- Shadows and borders
- Transitions and animations

## Architecture

This project follows **Clean Architecture** principles with **Event Sourcing** and **CQRS**:

- **Domain Layer**: Pure business logic with no external dependencies
- **Application Layer**: Use cases, command handlers, and projectors
- **Infrastructure Layer**: External services, databases, and adapters
- **Event Sourcing**: All state changes captured as immutable events
- **CQRS**: Clear separation between commands (writes) and queries (reads)
- **Projection Manager**: Lazy-loading read models with reference counting

### Key Architectural Patterns

- **Port & Adapter Pattern**: Clean interfaces for external dependencies
- **Event-Driven Architecture**: Loose coupling through domain events
- **Repository Pattern**: Data access abstraction
- **Factory Pattern**: Stateless event creation
- **Middleware Pattern**: Cross-cutting concerns like authentication

## Testing

The project follows a test-first development approach with comprehensive coverage:

- **Unit Tests**: Vitest with Testing Library (324 tests)
- **Component Tests**: Isolated component testing
- **Integration Tests**: Service integration testing
- **Authentication Tests**: OAuth flow and session management
- **Event Sourcing Tests**: Domain event handling
- **Accessibility Tests**: ARIA compliance verification

Run tests:

```bash
npm run test:unit
```

Test coverage includes:

- Domain services and value objects
- Command handlers and projectors
- Authentication middleware
- OAuth providers and session management
- WebSocket services
- Client-side services and utilities

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Ensure accessibility compliance
4. Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using SvelteKit and modern web technologies.
