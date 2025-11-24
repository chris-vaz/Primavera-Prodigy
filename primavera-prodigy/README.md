# Primavera Prodigy 🏗️

**A next-generation, client-side XER Editor & Viewer for Primavera P6.**

Primavera Prodigy is a high-performance web application designed to parse, visualize, and edit Oracle Primavera P6 (`.xer`) files entirely in the browser. It bridges the gap between complex desktop scheduling software and modern web interactivity without compromising data privacy.

## 🚀 Key Features
* **Privacy First:** 100% client-side parsing. Your data never leaves your machine.
* **Interactive Gantt:** Zoom, pan, and edit with virtual scrolling for large files (50k+ activities).
* **"What-If" Scenario Builder:** Branch your schedule to test delays and logic changes without altering the original file.
* **Data Intelligence:** Risk heatmaps based on float and resource contention.
* **Round-Trip Export:** Edit logic and durations, then export back to a valid `.xer` file for P6 import.

## 🛠️ Tech Stack
* **Core:** React 19, Vite, TypeScript
* **State:** Zustand + Immer
* **Viz:** D3.js, Canvas