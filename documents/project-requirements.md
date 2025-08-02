# Spanish Tutor - Project Roadmap

This document outlines the development plan for the personalized Spanish tutor application. The project is divided into six key phases, building upon each other to deliver the full functionality described in the initial plan.

---

## Phase 1: Project Setup & Core Foundation (Days 1-2)

**Goal:** Establish the project structure, database, authentication, and basic UI shell.

1.  **Repository & Project Initialization:**
    - Initialize a new Next.js 14 project using the App Router.
    - Configure TypeScript and Tailwind CSS.
    - Set up a Git repository and push the initial project.
    - Create the directory structure: `/app`, `/db`, `/lib`, `/components`.

2.  **Database Setup (Drizzle ORM + Turso/Neon):**
    - Create a new SQLite database instance.
    - Install and configure Drizzle ORM.
    - Define all tables (`user`, `lesson`, `session`, `skill_progress`, etc.) in `db/schema.ts` as per the data model.
    - Run initial migrations to set up the database schema.

3.  **Authentication:**
    - Integrate NextAuth.js.
    - Implement a simple `CredentialsProvider` for single-user login.
    - Create middleware to protect authenticated routes.
    - Manually seed the `user` table with your credentials.

4.  **Core UI Shell & SRS Logic:**
    - Develop the main application layout in `app/layout.tsx`.
    - Create placeholder pages for the main sections: `/lesson`, `/homework`, and a root dashboard.
    - Implement the Spaced Repetition System (SM-2 algorithm) logic in `lib/srs.ts`.
    - Build a basic `ReviewQueue.tsx` component to display items due for review on the dashboard.

---

## Phase 2: Interactive Session Features (Days 3-4)

**Goal:** Implement the core interactive elements: real-time voice and the whiteboard.

1.  **Real-time Voice Integration (OpenAI Realtime API):**
    - Create a secure API route (`/api/realtime/token`) to generate and send short-lived client tokens for the OpenAI Realtime service. **Never expose your master API key on the client.**
    - On the frontend, use WebRTC to establish a connection to the Realtime API using the fetched token.
    - Develop a `VoiceHUD.tsx` component to manage the voice session (start/stop, display status, handle microphone input and audio output).

2.  **Whiteboard Integration (tldraw):**
    - Integrate the `tldraw` component into a new `/board` page or component.
    - Create the `Board.tsx` component to host the canvas.
    - Establish a mechanism for the AI teacher to send drawing commands (`board_ops`) to the frontend during a lesson.
    - Write the client-side logic to interpret `board_ops` JSON and render them on the canvas (e.g., drawing text, shapes, arrows).
    - Implement functionality to save the final whiteboard state as JSON and export a PNG snapshot to Vercel Blob or other object storage.

---

## Phase 3: Curriculum & Lesson Logic (Days 5-6)

**Goal:** Load the curriculum and implement the logic for selecting the daily lesson.

1.  **Curriculum Implementation:**
    - Structure the CEFR-aligned curriculum content (e.g., A2, B1 units) as TypeScript or JSON files within the `/lib` directory.
    - Each lesson file will define its objectives, grammar points, and target vocabulary.
    - Write a seeding script to populate the `lesson` and `vocab` tables in the database from these curriculum files.

2.  **"Lesson of the Day" Logic:**
    - In `lib/level-plan.ts`, implement the function that selects the appropriate lesson for the day.
    - This logic should consider the user's current CEFR level, performance on past lessons, and items in the SRS queue.
    - The main dashboard will now dynamically display the chosen lesson and a "Start Lesson" button.

---

## Phase 4: Homework & Automated Grading (Days 7-8)

**Goal:** Build the complete homework lifecycle: assignment, submission, and automated grading.

1.  **Homework Assignment & Submission:**
    - At the end of a lesson, have the AI teacher generate and assign a relevant homework task.
    - Develop the UI for submitting different homework types (a text editor for writing, an audio recorder for speaking).
    - For speaking assignments, use the `gpt-4o-transcribe` API to get a transcript of the submitted audio.
    - Upload submission artifacts (text, audio files, transcripts) to object storage.

2.  **Automated Grading Endpoint:**
    - Create the backend API route `/api/grade`.
    - This endpoint will receive a submission ID, fetch the submission content and the homework's rubric from the database.
    - It will then call the OpenAI API with a carefully crafted prompt, instructing it to grade the submission based on the rubric and return a structured JSON object.
    - The prompt must enforce a JSON-only output with fields for scores, corrections, and feedback.

3.  **Displaying Graded Results:**
    - Store the structured grade data in the `submission` table.
    - Create a UI view where you can review your graded homework, including the detailed feedback, corrections, and suggested focus areas.

---

## Phase 5: Memory & Progression (Day 9)

**Goal:** Implement session summarization and update user progress metrics.

1.  **Session Summarization:**
    - Create the backend API route `/api/summary`.
    - After a session, send the key events or a simplified transcript to the OpenAI API.
    - The prompt will request a concise summary, a list of identified errors, and new vocabulary to add to the SRS queue.
    - Persist the results: the summary to the `session` table, errors to `error_log`, and new words to the `vocab` table.

2.  **Progress Tracking & SRS Updates:**
    - Based on performance during the lesson and on graded homework, update the `skill_progress` and `vocab_progress` tables.
    - Use the `lib/srs.ts` module to calculate the next review date for each item.

3.  **Error Dashboard:**
    - Create a simple component to visualize the most frequent errors from the `error_log`, providing a quick overview of areas needing improvement.

---

## Phase 6: Polish & Deployment (Day 10)

**Goal:** Finalize the application, perform thorough testing, and deploy to Vercel.

1.  **UI/UX Refinement:**
    - Conduct a full review of the application's UI.
    - Add loading indicators, user feedback notifications (e.g., toasts), and handle empty states gracefully.
    - Ensure the user flow is intuitive from login to logout.

2.  **End-to-End Testing:**
    - Manually test the complete daily user cycle: login, review due items, complete a lesson, submit homework, receive a grade, and log out.
    - Test for edge cases, such as API failures or loss of connectivity.

3.  **Deployment:**
    - Configure the project for production deployment on Vercel.
    - Set up all required environment variables (API keys, database URLs, etc.) in the Vercel dashboard.
    - Deploy the `main` branch and run final checks on the live application.
    - Monitor application logs for any post-deployment issues.
