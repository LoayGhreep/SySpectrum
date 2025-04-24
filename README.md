# 🛰️ Syspectrum

**Syspectrum** is a high-performance, agent-based system monitoring platform engineered for developers, sysadmins, and infrastructure warriors who want real-time insights without the bloat.

Built with a powerful Node.js agent, a blazing-fast Flutter dashboard, and a zero-dependency Node.js backend — **Syspectrum** runs anywhere, talks in structured JSON, and respects your system like a ninja: silent, efficient, and deadly accurate.

---

## 🚀 Why Syspectrum?

> “We couldn’t find a modern, lightweight, easy-to-deploy monitoring tool that wasn’t bloated or locked behind a paywall — so we built one.”

- ✅ **Node.js Native Agent** — Ultra-portable, works out of the box on Linux
- 🧠 **Real-Time Telemetry** — CPU, Memory, Disk, Network, Top Processes, Temp
- 🧩 **Modular Architecture** — Backend + Agent + Web Dashboard
- 🧪 **Structured Output** — Clean JSON for logs, APIs, and integrations
- 🔒 **Zero Trust Ready** — Logging, command execution, and remote access are opt-in only
- 🧊 **Dead-Silent Background Mode** — No desktop clutter, no GUI required
- 🚫 **No Vendor Lock-in** — Self-hosted. Yours forever.

---

## ⚙️ Architecture Overview

    +------------------+     Push API    +------------------+
    |  Node.js Agent   |  ────────────▶ |  Backend Server   |
    |------------------|                 |------------------|
    |  Shell Commands  |                 |  NeDB Storage    |
    |  JSON Output     |                 |  RESTful API     |
    +------------------+                 +--------▲---------+
                                                   │
                                                   │
                                          Flutter Web Dashboard

---

## 📊 Phase 1 - In Progress

| Metric        | Description                          |
|---------------|--------------------------------------|
| 🧠 CPU        | Load, usage, core count               |
| 🧮 Memory     | Total, used, available, percent       |
| 💾 Disk       | Total, used, mount points             |
| 🌐 Network    | RX / TX throughput per interface      |
| 🧰 Processes  | Top processes by CPU & RAM            |
| 🌡️ Temp       | CPU / system temperature (if available)|

> *Easy peasy?*
---

## 🔧 Phase 2 (Coming Soon — PRO Tier)

- 🔐 Remote Command Execution
- 📦 Self-updating Agents
- 🔁 Live Agent Sync & Config
- 🔔 Real-time Alerting
- 📡 Remote Restart / System Commands

> *This module will be available privately under commercial licensing.*

---

## 🌍 Use Cases

- 🛡️ Self-hosted server monitoring
- ⚙️ DevOps observability without Prometheus
- 🖥️ Personal lab or home infrastructure
- 👨‍💻 Lightweight alternative to Zabbix, Netdata, etc.
- 🧪 Internal diagnostics or CI/CD runner visibility

---

## 🧑‍💻 About the Author
Loay Ghreep — DevOps & Systems Engineer from Egypt.

- 💼 [LinkedIn](https://www.linkedin.com/in/loay-ghreep-379580112/)

I don’t just use tools, I build them.

---

## 📜 License
> *This project is licensed under the MIT License. Phase 2 features are commercially licensed.*