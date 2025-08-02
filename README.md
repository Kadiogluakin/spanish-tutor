# Spanish Tutor

A personal, voice-first Spanish teacher featuring an interactive AI tutor, a comprehensive curriculum from A1 to C2, a dynamic notebook, homework with automated grading, and an intelligent placement exam. This application is designed to provide a complete and immersive language learning experience, with a special focus on Argentine (Rioplatense) Spanish.

## Key Features

### Learning & Curriculum
*   **Comprehensive CEFR Curriculum (A1-C2)**: 44 lessons across 6 proficiency levels, covering grammar, vocabulary, and cultural nuances of Argentine Spanish.
*   **Intelligent Placement Exam**: A 33-question exam to accurately assess a user's CEFR level, including cultural competence and error-tolerant scoring.
*   **Lesson Catalog**: A "Netflix-style" browser for all lessons, allowing users to select any lesson from any unit, track completion, and filter by level, unit, or status.
*   **Voice-First AI Tutor (Profesora Elena)**: An interactive, voice-driven AI tutor with an authentic Argentine persona. It leverages OpenAI's Realtime API for natural conversation, provides real-time feedback, and uses a scaffolding approach for teaching.
*   **Dynamic Notebook**: The AI tutor automatically takes notes on vocabulary and key concepts during lessons, which are saved in a persistent, time-stamped notebook.

### Progress & Assessment
*   **Comprehensive Homework System**: Automatically assigned homework based on lesson completion, with level-appropriate prompts for writing and speaking.
*   **AI-Powered Automated Grading**: Submissions are graded by an AI using a detailed rubric, providing structured feedback, error corrections, and improvement recommendations.
*   **Progress & Analytics**: A dedicated dashboard to track skill progress, vocabulary acquisition (using SM-2 SRS algorithm), session history, and error analysis.
*   **Error Dashboard**: Visualizes common mistakes, tracks their frequency, and allows filtering by error type to identify areas for improvement.

### User Management & Settings
*   **Personal Profile Management**: Users can manage their personal information (name, age, interests, goals), which the AI uses to personalize the learning experience.
*   **AI Profile Discovery**: The AI can intelligently extract and populate user profile information from conversations.
*   **Security Management**: Includes secure password change functionality.
*   **Progress Reset**: Users can reset all their learning progress to start fresh.

## Tech Stack

*   **Framework**: Next.js 14+ (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **UI Components**: Radix UI
*   **Database**: Supabase (PostgreSQL)
*   **Authentication**: Supabase Auth
*   **AI & Voice**:
    *   OpenAI Realtime API (WebRTC for voice)
    *   GPT-4o (Content & grading)
    *   Whisper (Speech-to-text)

## Getting Started (Local Development)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/spanish-tutor.git
    cd spanish-tutor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    *   Copy `env.template` to a new file named `.env.local`:
        ```bash
        cp env.template .env.local
        ```
    *   Fill in the required values in `.env.local`. You'll need credentials for Supabase and OpenAI.

4.  **Set up the database:**
    *   Log in to your Supabase project.
    *   Go to the **SQL Editor**.
    *   Execute the SQL scripts located in the `scripts/` directory, starting with `scripts/phase5-supabase-migration.sql` and followed by any other necessary setup scripts like `scripts/placement-exam-migration.sql`.
    *   To seed the database with curriculum data, run the seeding script:
        ```bash
        node scripts/seed-supabase-curriculum.js
        ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Security

The application is built with a defense-in-depth security model:

*   **Authentication**: All sensitive API routes and pages are protected and require a valid user session.
*   **API Security**: Implements rate limiting, input validation (with Zod), request size limits, and CORS protection.
*   **Database Security**: Utilizes Supabase's Row Level Security (RLS) to ensure users can only access their own data. All user data tables have RLS policies enabled.
*   **Security Headers**: Sets security headers like HSTS, CSP, X-Frame-Options, etc., to protect against common web vulnerabilities.
*   **Password Security**: Enforces a strong password policy and provides secure password change functionality.
*   **Configuration**: Recommends best practices for Supabase dashboard configuration, including email confirmations and URL restrictions.

## Deployment

This application is optimized for deployment on Vercel.

1.  **Push to Git**: Push your code to a GitHub, GitLab, or Bitbucket repository.
2.  **Import to Vercel**: Import the project into your Vercel dashboard. Vercel will auto-detect the Next.js framework.
3.  **Configure Environment Variables**: In your Vercel project settings, go to **Settings → Environment Variables** and add the same variables from your `.env.local` file. Ensure they are available for Production, Preview, and Development environments.
4.  **Configure Supabase**: In your Supabase project, go to **Authentication → URL Configuration**. Add your Vercel domain to the **Site URL** and **Redirect URLs** (e.g., `https://your-app.vercel.app`).
5.  **Deploy**: Vercel will automatically build and deploy the application.
