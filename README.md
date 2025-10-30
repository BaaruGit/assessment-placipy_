# Placipy - Student Assessment Platform

A modern student assessment platform built with React, TypeScript, and Vite.

## Project Structure

This project follows a organized directory structure to maintain clean code separation and scalability:

```
For Now ...
src/
├── components/           # Reusable UI components
│   └── LoginForm.tsx     # Login form component
├── pages/               # Page components
│   └── LoginPage.tsx     # Login page using ColorBends background
├── Style-components/     # Custom styled components
│   └── Colorbends.ts     # Animated background component
├── App.css              # Main application styles
├── App.tsx              # Main application component
├── index.css            # Global styles
└── main.tsx             # Application entry point
```

## File Placement Guide

### Components Directory (`src/components/`)
Place all reusable UI components in this directory. These components should be self-contained and potentially used across multiple pages.

**Example**: [LoginForm.tsx](file:///c:/Assesment%20placipy/Assesment-placipy/src/components/LoginForm.tsx) - A form component for user authentication

### Pages Directory (`src/pages/`)
Place complete page components in this directory. Each page may compose multiple components and represent a complete view.

**Example**: [LoginPage.tsx](file:///c:/Assesment%20placipy/Assesment-placipy/src/pages/LoginPage.tsx) - The complete login page view

### Style Components Directory (`src/Style-components/`)
Place custom styled or animated components in this directory. These components typically have complex styling or animation logic.

**Example**: [Colorbends.ts](file:///c:/Assesment%20placipy/Assesment-placipy/src/Style-components/Colorbends.ts) - An animated background using Three.js

### Root Files (`src/`)
- [App.tsx](file:///c:/Assesment%20placipy/Assesment-placipy/src/App.tsx) - Main application component that routes to different pages

- [index.css](file:///c:/Assesment%20placipy/Assesment-placipy/src/index.css) - Global/base styles
- [main.tsx](file:///c:/Assesment%20placipy/Assesment-placipy/src/main.tsx) - Entry point that renders the application

## Color Palette

The application uses a carefully selected color palette:

- `#FBFAFB` - Soft white background
- `#9768E1` - Primary violet/purple accent
- `#E4D5F8` - Light lavender background
- `#A4878D` - Muted mauve (neutral tone)
- `#523C48` - Deep plum (text or contrast areas)
- `#D0BFE7` - Pastel lavender

## Development

To run the development server:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```

## UI/UX Principles

This application follows the 4 principles of UI/UX design:

1. **Clarity** - Clear visual hierarchy and purpose
2. **Efficiency** - Minimal steps to complete tasks
3. **Consistency** - Consistent design patterns throughout
4. **Beauty** - Aesthetically pleasing interface

## Technologies Used

- React 19
- TypeScript
- Vite
- Three.js (for animations)
- CSS3 (for styling)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```