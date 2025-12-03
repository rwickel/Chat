# RAG Chat Application

A React-based chat application that integrates with Retrieval-Augmented Generation (RAG) systems for enhanced conversational AI capabilities.

## Features

- **Chat Interface**: Modern, responsive chat UI with message history
- **Document Management**: Upload, select, and reference documents for context
- **RAG Integration**: Context-aware responses using document retrieval
- **Responsive Design**: Works on mobile and desktop devices
- **Sidebar Navigation**: Easy access to documents and settings
- **Context Chips**: Visual indicators for active document contexts
- **User and Assistant Icons**: Distinct visual identification for messages

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/rag-chat.git
   cd rag-chat/frontend
   ```

2. **Install dependencies**

   Using npm:

   ```bash
   npm install
   ```

   Using yarn:

   ```bash
   yarn install
   ```

3. **Start the development server**

   Using npm:

   ```bash
   npm run dev
   ```

   Using yarn:

   ```bash
   yarn dev
   ```

   The application should now be running on [http://localhost:5173/](http://localhost:5173/).

## Project Structure

```
rag-chat
├── frontend
│   ├── public
│   ├── src
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── types.ts
│   │   ├── components
│   │   │   ├── AppLayout.tsx
│   │   │   ├── ChatArea.tsx
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── ConfigModal.tsx
│   │   │   ├── ContextChips.tsx
│   │   │   ├── ContextMenu.tsx
│   │   │   ├── DocumentSelector.tsx
│   │   │   ├── DocumentsModal.tsx
│   │   │   ├── DocumentViewerContent.tsx
│   │   │   ├── DocumentViewerPanel.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── InputArea.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MobileDocumentOverlay.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── SimpleTextRenderer.tsx
│   │   ├── context
│   │   ├── hooks
│   │   ├── pages
│   │   ├── styles
│   │   └── utils
│   └── package.json
└── README.md
```

- **public/**: Static files and assets
- **src/**: Source code for the frontend application
  - **App.tsx**: Main application component
  - **main.tsx**: Entry point for React
  - **index.css**: Global styles
  - **types.ts**: TypeScript type definitions
  - **components/**: Reusable React components
    - **AppLayout.tsx**: Layout component for the app
    - **ChatArea.tsx**: Component for the chat area
    - **ChatHeader.tsx**: Header component for the chat
    - **ConfigModal.tsx**: Configuration modal component
    - **ContextChips.tsx**: Component for context chips
    - **ContextMenu.tsx**: Context menu component
    - **DocumentSelector.tsx**: Component for selecting documents
    - **DocumentsModal.tsx**: Modal for document management
    - **DocumentViewerContent.tsx**: Content component for document viewer
    - **DocumentViewerPanel.tsx**: Panel component for document viewer
    - **EmptyState.tsx**: Component for empty state representation
    - **InputArea.tsx**: Component for the input area
    - **Login.tsx**: Login component
    - **MainLayout.tsx**: Main layout component
    - **MessageBubble.tsx**: Component for message bubbles
    - **MessageList.tsx**: Component for the list of messages
    - **MobileDocumentOverlay.tsx**: Overlay component for mobile document view
    - **ProtectedRoute.tsx**: Component for protected routes
    - **Sidebar.tsx**: Sidebar component
    - **SimpleTextRenderer.tsx**: Component for rendering simple text
  - **context/**: React context for state management
  - **hooks/**: Custom React hooks
  - **pages/**: Page components for routing
  - **styles/**: Global styles and Tailwind configuration
  - **utils/**: Utility functions and constants
- **package.json**: Frontend dependencies and scripts
