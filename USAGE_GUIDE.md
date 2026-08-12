# 🌴 Coconut Plantation Digital Twin — User Manual & Operations Guide

Welcome to the **Coconut Plantation Digital Twin & Real-World Engineering Platform**! This guide provides step-by-step instructions on operating all interactive features, running hydraulic simulations, managing farm infrastructure, branching layouts, and protecting the main plantation design.

---

## 🎯 Quick Links
- 🌐 **Live Web Application**: [https://frontend-mu-tawny-d4xcmpjhrq.vercel.app](https://frontend-mu-tawny-d4xcmpjhrq.vercel.app)
- 🐙 **GitHub Repository**: [https://github.com/abhay2008/coconut-farm-digital-twin](https://github.com/abhay2008/coconut-farm-digital-twin)

---

## 🌿 Layout Branching, Versioning & Password Protection

### 1. Default Main Branch Loading
- Whenever you open or refresh the website, the official **`main`** branch layout automatically pops up and loads by default.

### 2. Saving a Layout Version
Click **"💾 Save Layout Permanently"** in the left-hand **Infrastructure Toolbox** to open the Save Layout modal:

- **Option 1: Save as a Branch** 🌿
  1. Click the **1. Save as Branch** tab.
  2. Type a custom branch name (e.g. `North Sector High Flow`, `John Drip Test`).
  3. Click **Save Branch**. (No password required).
- **Option 2: Save to Main Branch** 🔒
  1. Click the **2. Save to Main 🔒** tab.
  2. Enter the security password.
  3. Click **Overwrite Main Branch**.
  *(Note: Overwriting `main` updates the default layout presented to all visitors).*

### 3. Branch Version Manager (`🔀 Switch / Manage`)
Click **"🔀 Switch / Manage"** in the active branch bar at the top of the toolbox:
- **Switching / Loading Branches**: Click **Load** next to any branch in the list to switch your active canvas and hydraulic simulation to that version.
- **Deleting Custom Branches**: Click the trash icon next to a custom branch to delete it.
- **Deleting / Resetting Main Branch**: Click the trash icon next to `main` $\to$ enter security password $\to$ click **Reset Main**. This restores `main` back to the ground-truth 1,222 tree factory default.

---

## 🕹️ Canvas Navigation & Display Controls

### 1. Navigating the 25-Acre Map
- **Zooming**: Use your mouse scroll wheel (or double-finger swipe on touchpad) to zoom in and out. Zoom level ranges from $0.3\times$ (full plantation overview) to $3.0\times$ (individual tree root ring details).
- **Panning**: Click and hold any empty area of the canvas to drag and pan across the farm terrain.

### 2. Satellite Map Opacity Slider
- Locate the **Satellite Map Opacity** slider in the left-hand **Infrastructure Toolbox**.
- Adjust the slider between **10%** and **100%**:
  - **100%**: Full satellite photo view showing ground soil and aerial vegetation.
  - **30% - 50%**: Dimmed terrain view ideal for focusing on pipe routes and motor locations.

### 3. ✨ High-Contrast Pipe Mode
- Toggle **High-Contrast Pipe Mode** in the toolbox to enable a dark outline stroke backing behind all pipeline paths.
- This ensures $110\text{ mm}$ Mainlines, $75\text{ mm}$ Sublines, and $40\text{ mm}$ Ladders remain highly visible against any ground background color or satellite exposure.

---

## 🌴 Tree Twin Management & Emitter Control

### 1. Tree Canopy Visual Age & Health
The digital twin tracks **1,222 individual coconut palm trees**:
- **Tree Canopy Diameter**: Dynamically scales based on tree age:
  - 🟢 **Young (0–3 yrs)**: Smaller canopy radius ($2.5\text{m}$)
  - 🟢 **Medium (4–8 yrs)**: Medium canopy radius ($4.0\text{m}$)
  - 🟢 **Mature (9+ yrs)**: Full adult canopy radius ($6.0\text{m}$)
- **Canopy Color**:
  - 🟢 **Green**: Healthy moisture status
  - 🟡 **Yellow**: Under-irrigated warning (local pressure $< 0.8\text{ bar}$)

### 2. Inspecting an Individual Tree
1. Click on any red tree dot on the canvas.
2. The **Tree Inspector Panel** appears on the right side of the screen.
3. View real-time metadata:
   - **Tree ID** (e.g. `TREE-0421`)
   - **Variety & Age**
   - **Health Index**
   - **Calculated Flow Rate ($\text{LPH}$)**
   - **Microsprinkler / Dripper Holes Slider** ($1\text{ to }16$ holes)

### 3. Universal & Per-Tree Emitter Hole Controls
- **Universal Farm-Wide Setting**:
  1. Open the left **Infrastructure Toolbox**.
  2. Slide the **Universal Dripper Hole Control** (e.g. to $4, 8, \text{ or } 12$ holes).
  3. Click **`Set All (1,222)`**.
  4. All trees across the plantation will update instantly.
- **Per-Tree Customization**:
  1. Click an individual tree to open its Inspector.
  2. Adjust the slider to set a custom hole count for that tree.
  3. The canvas will update the blue microsprinkler dots around that specific tree ring.

---

## ⚡ Motors, Pumps & Borewell Drag-Binding

### 1. Pump Infrastructure Setup
- **Submersible Motor (10 HP)**: Mounted inside the $500,000\text{ L}$ Storage Pond at $(x: 636, y: 504)$. Drives main farm supply.
- **7 Surface Monoblock Motors**: Mounted at each of the 7 borewell wellheads to pump groundwater into the central storage pond.
- **1 Surface Booster Pump**: Mounted along the subline sector.

### 2. Dynamic Borewell-Motor Drag Binding
- Dragging any of the **7 Borewells** automatically moves its paired **Surface Monoblock Motor** alongside it ($+15\text{px}$ offset).
- The cyan delivery pipe connecting the borewell to the storage pond automatically recalculates its route and length in real time, updating the Hazen-Williams friction loss calculation.

---

## 🎛️ Pipeline Layer Filtering

Use the checkboxes in the **Infrastructure Toolbox** to toggle visual layers:
- `[x] 🔴 Mainlines (110mm)` — Primary feeder network from Fertigation Station
- `[x] 🔵 Sublines (75mm)` — Sector lines distributing to tree blocks
- `[x] 🟠 Ladders (40mm)` — Manifold connections between rows
- `[x] 🔄 Drip Loops (16mm)` — 16mm circular tree root rings
- `[x] 💧 Well & Pond Lines` — Cyan raw water extraction lines

---

<p align="center"><b>Coconut Plantation Digital Twin & Real-World Engineering Platform</b></p>
