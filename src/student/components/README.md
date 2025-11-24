# AssessmentTaking Component

## Overview
The AssessmentTaking component is a comprehensive assessment interface that allows students to take programming assessments with both multiple-choice questions (MCQs) and coding challenges. It features a 60-minute countdown timer, fullscreen mode, and real-time code execution using the Judge0 CE API.

## Features
- **Two Assessment Types**: MCQ section with 20 questions and Coding section with 5 challenges
- **60-Minute Timer**: Countdown timer with visual warnings when time is running low
- **Fullscreen Mode**: Toggle fullscreen view for focused assessment taking
- **Responsive Design**: Works on both desktop and mobile devices
- **Real-time Code Execution**: Execute code in 10 programming languages using Judge0 CE API
- **Split-screen Coding UI**: Problem description on left, code editor and results on right
- **Auto-run Toggle**: Enable/disable automatic code execution as you type

## Languages Supported
1. JavaScript
2. Python
3. Java
4. C
5. C++
6. C#
7. PHP
8. Ruby
9. Go
10. Rust

## Component Structure
- **MCQ Section**: 
  - 20 predefined questions with 4 options each
  - Navigation between questions
  - Progress indicator
  - Answer selection with visual feedback

- **Coding Section**:
  - 5 coding challenges:
    1. Reverse a String
    2. Find Maximum Number
    3. Check Palindrome
    4. Array Sum
    5. FizzBuzz
  - Problem description with examples
  - Code editor with syntax highlighting
  - Language selector
  - Custom input field
  - Execution result panel

## API Integration
The component integrates with the Judge0 CE API for real-time code execution:
- **API Service**: Located in `src/services/judge0.service.ts`
- **Environment Variable**: `VITE_JUDGE0_API_KEY` (stored in `.env` file)

## Usage
To use the AssessmentTaking component:
1. Navigate to `/student/assessment-taking` in the application
2. Toggle between MCQ and Coding sections using the tabs
3. For MCQ section:
   - Select answers for each question
   - Navigate using Previous/Next buttons
4. For Coding section:
   - Select a programming language
   - Write your solution in the code editor
   - Use Run Example or Run Code buttons to execute
   - Toggle Auto Run on/off as needed
   - View results in the output panel

## Setup
1. Obtain a RapidAPI key for Judge0 CE
2. Add the key to your `.env` file:
   ```
   VITE_JUDGE0_API_KEY=your_rapidapi_key_here
   ```

## Dependencies
- React (v18+)
- TypeScript
- Axios (for API requests)
- Judge0 CE API

## Files
- `AssessmentTaking.tsx`: Main component
- `AssessmentTaking.css`: Component styles
- `judge0.service.ts`: API service for Judge0 integration