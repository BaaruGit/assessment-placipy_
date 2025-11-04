# PlaciPy - Placement Management System

PlaciPy is a comprehensive placement management system designed for educational institutions to streamline the placement process for students, training officers, and administrators.

## Features

- **Role-based Dashboards**: Separate interfaces for Students, Placement Training Officers (PTO), Placement Training Staff (PTS), and Administrators
- **Assessment Management**: Create, schedule, and manage assessments for placement preparation
- **Student Tracking**: Monitor student progress and placement statistics
- **Reporting & Analytics**: Generate detailed reports on placement statistics and performance metrics
- **Secure Authentication**: AWS Cognito integration for secure user authentication and authorization

## Technology Stack

### Frontend
- React with TypeScript
- React Router for navigation
- CSS Modules for styling
- React Icons for UI icons

### Backend
- Node.js with Express
- AWS Cognito for authentication
- DynamoDB for data storage
- RESTful API architecture

## Project Structure

```
.
├── backend
│   ├── src
│   │   ├── auth
│   │   ├── routes
│   │   └── services
│   └── scripts
├── src
│   ├── company-admin
│   ├── components
│   ├── css-files
│   ├── pages
│   ├── pto
│   ├── pts
│   ├── services
│   ├── student
│   └── Style-components
└── ...
```

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Configure environment variables (see backend README for details)
4. Start the server: `npm run dev`

### Frontend Setup
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`

## Future Plans

### Authentication Improvements
- **Cookie-based Authentication**: Implementation of secure HTTP-only cookies for token storage as an alternative to localStorage
- **First-party vs Third-party Cookie Decision**: Evaluation and decision on whether to use first-party or third-party cookies based on browser support and security considerations

### UI/UX Enhancements
- **Responsive Design Improvements**: Enhanced mobile experience across all dashboards
- **Dark Mode Support**: Implementation of dark/light theme toggle
- **Accessibility Improvements**: WCAG compliance and screen reader support

### Feature Extensions
- **Real-time Notifications**: WebSocket integration for instant notifications
- **Advanced Analytics Dashboard**: Enhanced data visualization and reporting
- **Mobile Application**: React Native mobile app for on-the-go access
- **Integration Capabilities**: APIs for integration with external systems (LMS, HR systems, etc.)

# Placipy - Student Assessment Platform

A modern student assessment platform built with React, TypeScript, and Vite.

## Project Structure

This project follows a organized directory structure to maintain clean code separation and scalability:

```
src/
├── components/           # Reusable UI components
│   └── LoginForm.tsx     # Login form component
├── pages/               # Page components
│   └── LoginPage.tsx     # Login page using ColorBends background
├── Style-components/     # Custom styled components
│   └── Colorbends.ts     # Animated background component
├── student/             # Student portal dashboard
│   ├── components/       # Student dashboard components
│   ├── pages/            # Student dashboard pages
│   ├── styles/           # Student dashboard styles
│   └── README.md         # Student portal documentation
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

### Student Portal Directory (`src/student/`)
Contains the complete student dashboard implementation with all requested features.

**Subdirectories**:
- `components/` - Individual feature components
- `pages/` - Main dashboard page
- `styles/` - Dashboard-specific CSS

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
- React Router DOM
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

## Student Portal Features

The student portal includes all the requested features:

### 🔹 Dashboard
- Personalized welcome panel
- Active, upcoming, and completed assessments list
- Assessment progress tracker
- Performance summary chart

### 🔹 Assessments
- View all active tests with start time, duration, and instructions
- Attend test directly from dashboard
- Auto-save during the test (simulated)
- Result page (after completion or after staff publishes results)
- Filter assessments by department or topic

### 🔹 Results & Reports
- View scores, ranks, and feedback
- Detailed analysis: correct/incorrect answers, time spent
- Department ranking board

### 🔹 Profile
- Manage student details (name, roll number, department, etc.)
- Change password
- View test history

### 🔹 Notifications
- Alerts for new assessments or results
- College-wide announcements
- Messages from placement officer or staff

For detailed documentation on the student portal, see [src/student/README.md](src/student/README.md).