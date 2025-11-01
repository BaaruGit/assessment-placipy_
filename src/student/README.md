# Student Portal Dashboard

A modern, responsive dashboard for students with all the requested features implemented using React and TypeScript.

## Features Implemented

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

## Design & Technology

- **Primary Color**: #9768E1 (purple)
- **Modern UI**: Clean, responsive design with smooth animations
- **Routing**: React Router for navigation between sections
- **Components**: Modular, reusable React components
- **Styling**: CSS with variables for consistent theming

## Folder Structure

```
src/student/
├── components/
│   ├── DashboardHome.tsx
│   ├── Assessments.tsx
│   ├── ResultsReports.tsx
│   ├── Profile.tsx
│   └── Notifications.tsx
├── pages/
│   └── Dashboard.tsx
├── styles/
│   └── Dashboard.css
└── README.md
```

## How to Navigate

1. Login with any credentials (simulated authentication)
2. You'll be redirected to the Student Dashboard
3. Use the sidebar navigation to access different sections:
   - Dashboard (default view)
   - Assessments
   - Results & Reports
   - Profile
   - Notifications

## Color Palette

- Primary: `#9768E1` (purple)
- Secondary: `#523C48` (dark purple)
- Background: `#FBFAFB` (light gray)
- Accent: `#D0BFE7` (light purple)

## Responsive Design

The dashboard is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile devices

Media queries adjust the layout for screens smaller than 768px.