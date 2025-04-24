# Fictsu

Welcome to the **Fictsu** This repository contains everything you need to run the full Fictsu platform locally with Docker:

- **Frontend**: `fictsu-frontend` – built with Next.js
- **Backend**: `fictsu-backend` – built with Gin Web Framework
- **Database**: PostgreSQL via Docker Compose

---

## 🚀 Getting Started

These instructions will help you run the full Fictsu stack locally using Docker.

### ✅ Prerequisites

Make sure you have the following installed:

- [Docker](https://www.docker.com/products/docker-desktop)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 🛠️ Running Fictsu

### 1. Clone the Repository

```bash
git clone https://github.com/fictsu/fictsu.git
cd fictsu
```

### 2. Start the Project
Use Docker Compose to spin up everything:

```bash
docker-compose up --build
```

This will:

* Start the backend (Gin) on localhost:8080
* Start the frontend (Next.js) on localhost:3000
* Start PostgreSQL on the configured port (default: 5432)
