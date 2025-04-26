# 📚 Fictsu

Welcome to **Fictsu** – the collaborative fiction platform.  
This repository contains everything you need to run the full Fictsu stack locally using Docker:

- **Frontend**: `fictsu-frontend` – built with Next.js
- **Backend**: `fictsu-backend` – powered by the Gin Web Framework (Go)
- **Database**: PostgreSQL via Docker Compose

---

## 🚀 Getting Started

These instructions will help you run the full Fictsu platform on your local machine.

### ✅ Prerequisites

Make sure you have the following installed:

- [Docker](https://www.docker.com/products/docker-desktop)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 🛠️ Running Fictsu

### 1. Clone the Repository

```bash
git clone https://github.com/Fictsu/Fictsu.git
cd Fictsu
```

### 2. Set Up Environment Variables

Before running the project, make sure you copy and edit the environment files for the backend and frontend:

```bash
cp fictsu-backend/.env.example fictsu-backend/.env
```

> 🔑 Update the `.env` file with your own credentials:
> - Google OAuth Client ID & Secret
> - OpenAI Key & Secret
> - Firebase credentials

### 🔐 Setting Up Required Secrets

To run Fictsu, you need a few API keys and service credentials:

#### 1. **Google OAuth 2.0 Credentials**
Used for user login:
- Visit [Google Developer Console](https://console.developers.google.com/)
- Create/select a project
- Go to **APIs & Services > Credentials**
- Create OAuth 2.0 Client ID
- Add the `CLIENT_ID`, `CLIENT_SECRET`, and `CLIENT_CALLBACK_URL` to the `.env`

#### 2. **OpenAI API Key**
Used for AI features:
- Go to [OpenAI](https://platform.openai.com/account/api-keys)
- Create an API key and get your Org and Project ID if needed
- Add `OPENAI_KEY`, `OPENAI_ORG_ID`, `OPENAI_PROJ_ID` to `.env`

#### 3. **Firebase Storage**
Used for image uploads:
- Go to [Firebase Console](https://console.firebase.google.com/)
- Set up Firebase Storage
- Create a bucket, and note the name
- In **Project Settings > Service Accounts**, generate a new private key
- Store the service key securely and add your `BUCKET_NAME` to `.env`

---

### 3. Start the Project

Use Docker Compose to spin up everything:

```bash
docker-compose up --build
```

This will:

- Start the backend (Gin) on `http://localhost:8080`
- Start the frontend (Next.js) on `http://localhost:3000`
- Start PostgreSQL on the configured port (default: `5432`)

---

## ✅ Visit the Web App

Once everything is running, open your browser and go to:

```
http://localhost:3000
```

This will open the Fictsu frontend. You can sign in with Google, browse fictions, create your own stories, and start writing collaboratively!

---

## 📦 Project Structure

```
Fictsu/
├── docker-compose.yml         # Orchestration for backend, frontend, and database
├── fictsu-frontend/           # Next.js frontend
├── fictsu-backend/            # Gin (Go) backend
```

---

## 🔐 Authentication & Image Uploads

- **Authentication**: Uses Google OAuth 2.0 for user login.
- **Image Uploads**: Handled via Firebase Storage. Make sure Firebase credentials are set correctly in your environment files.

---

## 📄 Project Resources

- [SDD Document](https://drive.google.com/file/d/13O8uWU53G_1AnZ8X_GQiCftovEIb6sjZ/view?usp=drive_link)
- [Poster](https://drive.google.com/file/d/1q5nT7LOqsiPDXeLDAl2IvovOv8sIRgha/view?usp=sharing)

---

> _Fictsu: Write, share, and imagine fiction together._ ✨
