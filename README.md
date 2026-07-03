# 🚀 IpHire AI — Career Operating System

IpHire is a premium, AI-powered Career Operating System designed to automate, streamline, and optimize the entire job application lifecycle. It combines a state-of-the-art web application, a local-first synced database architecture, a browser automation agent extension, and a native desktop wrapper.

---

## 🎨 Key Features & Modules

### 1. 📂 Core Studio Modules
*   **Resume Studio**: Build, score, and customize resumes. Run ATS checks with real-time feedback. Export clean Markdown, Word-compatible files, or custom PDF formats.
*   **Cover Letter Builder**: Generate highly tailored cover letters targeting Enterprise, Startups, or Executive roles using AI.
*   **Job Analyzer**: Calculate instant compatibility scores, matching keywords, and discover critical skill gaps for any role.
*   **Interview Coach**: Practice with interactive voice mock interviews using built-in Text-to-Speech (interviewer) and Speech-to-Text (speech recognition).
*   **Job Discovery**: Scan real-time opportunities, powered by default fallback integrations with the **Jooble API**.

### 2. 🧩 Chrome Extension — IpHire Autofill Agent
A Manifest V3 browser companion located in `/extension` that scans job application forms on any third-party site (LinkedIn, Indeed, etc.) and auto-fills them with one-click:
*   Injects a floating, branded **"Fill Application"** panel on active pages.
*   Intelligent mapping of inputs (email, phone, LinkedIn, GitHub, resume uploads, etc.) to your profile data.
*   Local background sync with the IpHire Web Client.

### 3. ☁️ TiDB Cloud Sync
*   **Offline-First**: Uses local IndexedDB for sub-millisecond page loads and offline resilience.
*   **Cloud Synchronizer**: Optional zero-friction sync to a free **TiDB Cloud (MySQL)** cluster via TLS v1.2.
*   **Privacy-First**: All API keys, credentials, and profile details are stored locally inside the browser.

### 4. 🖥️ Tauri v2 Desktop Wrapper
*   Pre-configured native build setup under `/src-tauri` to compile standalone Windows & macOS binaries.
*   Hides background CLI windows automatically, with custom security capability profiles.

---

## 🛠️ Technology Stack
*   **Frontend**: Next.js 16 (App Router, Turbopack), Tailwind CSS v4, Framer Motion
*   **Icons**: Lucide React
*   **Database**: Client-side IndexedDB, Server-side TiDB Cloud (AWS) via `mysql2/promise` pool
*   **AI Integration**: Custom OpenAI-compatible gateway supporting OpenAI, Anthropic, Gemini, DeepSeek, Local (Ollama/LM Studio), and NVIDIA NIM.
*   **File Parsers**: `pdfjs-dist` (local worker-driven PDF reader), `mammoth` (DOCX to text converter)
*   **Desktop Application**: Tauri v2, Rust

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   NPM or PNPM

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory and configure your keys:
```env
# Database Credentials
DB_HOST=gateway01.us-east-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USERNAME=your_tidb_username
DB_PASSWORD=your_tidb_password
DB_DATABASE=your_db_name

# Jooble Default Integration Key
JOOBLE_API_KEY=your_jooble_api_key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧩 Installing the Chrome Extension
1. Open Google Chrome or any Chromium browser.
2. Navigate to `chrome://extensions`.
3. Enable **Developer Mode** using the toggle in the top-right corner.
4. Click **Load Unpacked** in the top-left corner.
5. Select the `/extension` directory inside this project root.

---

## 🖥️ Building the Desktop App (Tauri v2)
Ensure you have Rust and Cargo installed:
```powershell
# Install Rust Toolchain
winget install Rustlang.Rustup

# Install Tauri CLI & Run
cargo install tauri-cli
cargo tauri dev
```

---

## 📜 License & Authors
*   **License**: Licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
*   **Author**: Developed for IpHire Career Solutions.
