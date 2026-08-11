# Build Prompt — Coconut Farm Digital Twin & Precision Ag Platform

> **How to use this file:** Paste this entire document as your first message to a coding CLI (Claude Code, Cursor, Aider, etc.), or drop it in your repo root as `BUILD_SPEC.md` and point the agent at it. It is written as a working brief, not a chat prompt — the agent should treat the "Working Agreement" section as binding process rules.

---

## Role & Objective

You are acting as a senior full-stack engineer building an interactive Digital Twin and Farm Management System for a 25-acre coconut plantation (~1,000+ trees). The system has four coupled modules: a computer-vision tree-detection pipeline, shared data schemas, an interactive React/Konva mapping canvas, and a graph-based hydraulic/fertigation simulation engine. Build them in the phase order below — later phases depend on earlier ones.

---

## Ground Truth & Constraints

- Farm: 25 acres, 1,000+ coconut trees, 1 pond, 1 house, 7 borewells, an internal dirt road/driveway.
- **A stylized/annotated reference photo of the farm layout exists (see "Reference Layout" below), but no raw georeferenced satellite/aerial file or GPS survey exists yet.** Build against synthetic fixture data derived from the reference layout so real georeferenced data can be dropped in later with zero refactoring — do not block phases on missing real inputs.
- The farm boundary is an **irregular polygon**, not a rectangle, and a dirt road corridor cuts through it — planting is not a perfectly uniform grid across all 25 acres; density thins near the road, pond, house, and one bare/cleared patch.
- Target stack: Python (CV pipeline), TypeScript/React + Next.js + Konva.js (frontend), TypeScript (simulation engine), JSON/GeoJSON (data interchange).
- Performance target: smooth interaction with 2,000+ simultaneous vector elements at 60 FPS, desktop and mobile.

### Reference Layout (from provided farm photo)

The user supplied an annotated overhead photo with the boundary, pond, house, road, and tree positions already marked. It's a stylized/rendered image, not a raw georeferenced orthophoto — treat it as a **layout reference for building a realistic synthetic fixture**, not as direct CV pipeline input. Approximate normalized positions (fraction of image width/height, origin top-left), eyeballed from the photo — not surveyed truth:

- **Boundary polygon:** irregular — narrows near the top-center, widens across the bottom-right, with a notch near the top-left corner where the pond/house sit just outside the tree rows.
- **Pond:** top-left region, roughly `x: 0.05–0.17, y: 0.15–0.33`, rectangular.
- **House/buildings:** just below-left of the pond, roughly `x: 0.01–0.09, y: 0.33–0.46`, two small structures.
- **Road:** a dirt driveway enters at the bottom around `x: 0.35, y: 1.0`, curves and forks near `x: 0.5, y: 0.65`, and exits at the top-right around `x: 0.95, y: 0.02` — a hard no-tree corridor through the middle of the property.
- **Sparse/cleared patch:** bare reddish soil with few trees near `x: 0.30–0.45, y: 0.15–0.30`.
- **Tree rows:** fairly regular grid spacing across most of the property, visibly denser in the left-center block than near the boundary edges.

Flag in code comments that these are eyeballed placeholders to be swapped for real GPS coordinates once surveyed.

---

## Phase 0 — Shared Data Schemas (build first; everything else depends on this)

Define once, reuse everywhere (JSON Schema + generated Python `pydantic` models + TypeScript types), so the CV pipeline, frontend, and simulation engine never disagree about field names.

```typescript
interface Tree {
  id: string;                // "TREE-0421"
  variety: string;
  planted_date?: string;
  age_years?: number;
  last_yield_date?: string;
  position: { lat: number; lng: number; pixel_x: number; pixel_y: number };
  canopy_radius_m: number;
  health_index: number;      // 0-1
  grid_row: number;
  grid_col: number;
  drip_emitter_id?: string;
  notes: string[];
}

interface PipeSegment {
  id: string;
  type: "main" | "sub" | "drip_lateral";
  from_node_id: string;
  to_node_id: string;
  diameter_mm: number;
  length_m: number;
  material?: string;
}

interface Motor {
  id: string;
  type: "borewell_motor" | "pump";
  hp: number;
  rated_flow_lpm: number;
  rated_head_m: number;
  location: { lat: number; lng: number };
  status: "on" | "off" | "fault";
}

interface FarmBoundary {
  polygon: { lat: number; lng: number }[];
  area_acres: number;
  features: { type: "pond" | "house" | "borewell"; position: { lat: number; lng: number }; label: string }[];
}

interface FertigationEvent {
  id: string;
  injector_id: string;
  nutrient_mix: string;
  start_time: string;
  duration_min: number;
  dosing_rate_lph: number;
}
```

**Tasks:**
1. Write these as `schemas/*.schema.json` (JSON Schema draft-2020-12), `models/farm.py` (pydantic), and `types/farm.ts`.
2. Generate a synthetic `fixtures/farm_data.json` modeled on the **Reference Layout** above: an irregular boundary polygon, ~1,000 trees at a plausible pitch (e.g. 6m x 6m) thinned out near the road corridor, pond, house, and cleared patch, 1 pond, 1 house, 7 borewells, and a simple main/sub/lateral pipe network. This gives later phases real-world topology to validate against instead of a trivial perfect rectangle.

**Acceptance:** all three schema representations validate the fixture file without error.

---

## Phase 1 — Computer Vision Pipeline (Python)

**Input:** one georeferenced aerial/satellite image (GeoTIFF, or JPG + world file).

**Model choice:** use **DeepForest** (pretrained crown-detection model) as the baseline detector — it's tuned for aerial canopy detection out of the box and needs no labeled data to start. Document a fallback path to fine-tune **YOLOv8n** on manually labeled crops if DeepForest precision on a validation subset falls below ~90%. Don't build both up front — baseline first, fallback documented but not implemented until needed.

**Grid-snap post-processor (OpenCV):** using the known row/column pitch (a config parameter, since real spacing is unknown yet):
- Suppress duplicate detections from overlapping canopies (non-max suppression keyed to expected inter-tree distance).
- Snap accepted centroids to the nearest expected grid intersection.
- Flag grid positions with no detection as "missing tree" candidates (dead tree / replant flag) rather than silently dropping them.
- **Clip against the farm boundary polygon** (irregular, not a rectangle — see Reference Layout) so grid generation never places phantom trees outside the property line.
- **Exclude no-tree corridors** (road, pond, house footprint) from grid-snap candidates rather than treating gaps there as missing trees.

**Output:** `trees.json` + `trees.geojson`, matching the Phase 0 `Tree` schema.

**CLI usage:** `python pipeline.py --image farm.tif --grid-spacing 6.0 --out trees.json`

**Acceptance:** generate a synthetic test image (a simple dot-grid PNG standing in for canopies) and confirm the pipeline recovers >95% of the known synthetic tree positions before ever touching real imagery.

---

## Phase 2 — Frontend: React + Konva Interactive Canvas

Next.js + `react-konva`.

- Load `farm_data.json`/GeoJSON, support pan/zoom.
- **LOD system:** below a zoom threshold, render simple dot markers with count overlays; above it, transition to stylized SVG palm icons, `TREE-0421`-style labels, and drip-emitter attachment points.
- **Infrastructure toolbox:** draw/edit main, sub, and drip-lateral pipelines as polylines; place motor/pump nodes (HP, pressure, flow fields); place fertigation injectors and valves.
- **Tree inspector modal:** clicking a tree opens a sidebar — ID, age, variety, last yield date, drip emitter status (LPH, soil moisture, fertigation schedule), health notes, maintenance log.
- **Performance:** for 2,000+ elements at 60 FPS, cache static Konva layers, set `listening={false}` on non-interactive layers, and cull off-viewport nodes rather than rendering the full tree set every frame.

**Acceptance:** the synthetic 1,000-tree fixture renders and pans/zooms at 60 FPS in Chrome DevTools' performance panel; all toolbox and modal interactions work against fixture data.

---

## Phase 3 — Hydraulic & Fertigation Simulation Engine (TypeScript)

Model the infrastructure as a directed graph: **nodes** = motor sources, junctions, tree emitters; **edges** = pipe segments with diameter, length, and friction loss.

- Start with a simplified linear pressure-drop-per-meter model per lateral to get an end-to-end simulation working quickly; iterate to a full Hazen-Williams head-loss solve only once the simple version is validated against the fixture graph.
- Output: pressure value at every node, with under-pressure emitters flagged below a configurable LPH threshold.
- Expose a heatmap-ready output (pressure-loss value per pipe segment / tree) for Phase 2 to render as a color overlay.

**Acceptance:** on the synthetic fixture graph, the simulation correctly identifies end-of-line trees as having the lowest pressure (sanity check against known graph topology, not just "it runs").

---

## Phase 4 — Integration

Wire Phase 1 output → Phase 0 schema → Phase 2 canvas → Phase 3 simulation overlay, end to end: running the pipeline on an image populates the web app, and running the simulation renders the pressure heatmap on the same canvas.

---

## Explicit Non-Goals (do not build unless separately requested)

- Authentication / multi-user accounts.
- Native mobile app (responsive web only).
- Live IoT sensor ingestion — schema should have hooks (e.g. `soil_moisture`) but no live pipeline.
- Deployment infrastructure (Docker/K8s/CI).

---

## Open Inputs Still Needed From the Farm Owner

Stub or mock these until provided — do not let their absence block any phase:
- A **raw, georeferenced** aerial/satellite image (GeoTIFF or JPG+world file) — the annotated reference photo is a useful layout aid but isn't georeferenced and isn't suitable as direct CV pipeline input.
- Surveyed GPS coordinates of the farm boundary, pond, house, road, and 7 borewells (the reference photo only gives approximate relative positions).
- Actual planting grid pitch (row/column spacing) used on the farm, and confirmation of where/why density thins (road, cleared patch).
- As-built pipe network (diameters, lengths) or a plan to survey it.
- Pump specs (HP, rated flow/head) for each of the 7 borewells.

---

## Working Agreement for the Agent

1. Work through the phases strictly in order — do not skip ahead to Phase 2 before Phase 0/1 fixtures exist.
2. After completing each phase, run its acceptance check, report the result, and pause for confirmation before starting the next phase.
3. Always prefer synthetic/mock data over blocking on a missing real input.
4. Pin dependencies as you go (`requirements.txt`, `package.json`) rather than at the end.
