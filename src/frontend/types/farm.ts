export interface Position {
  lat: number;
  lng: number;
  pixel_x: number;
  pixel_y: number;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Tree {
  id: string;
  variety: string;
  planted_date?: string;
  age_years?: number;
  last_yield_date?: string;
  position: Position;
  canopy_radius_m: number;
  health_index: number;
  grid_row: number;
  grid_col: number;
  drip_emitter_id?: string;
  notes: string[];
  is_manual?: boolean;
  dripper_count?: number;
}

export interface PipeSegment {
  id: string;
  type: "main" | "sub" | "drip_lateral";
  from_node_id: string;
  to_node_id: string;
  diameter_mm: number;
  length_m: number;
  material?: string;
}

export interface Motor {
  id: string;
  type: "borewell_motor" | "pump";
  hp: number;
  rated_flow_lpm: number;
  rated_head_m: number;
  location: Location;
  status: "on" | "off" | "fault";
}

export interface Feature {
  type: "pond" | "house" | "borewell";
  position: Location;
  label: string;
}

export interface FarmBoundary {
  polygon: Location[];
  area_acres: number;
  features: Feature[];
}

export interface FertigationEvent {
  id: string;
  injector_id: string;
  nutrient_mix: string;
  start_time: string;
  duration_min: number;
  dosing_rate_lph: number;
}

export interface PlacableComponent {
  id: string;
  type: 
    | "borewell" 
    | "motor_7.5hp" 
    | "motor_10hp" 
    | "subline_booster_motor"
    | "pond" 
    | "fertigation_unit" 
    | "main_pipe" 
    | "subline" 
    | "ladder" 
    | "tree_drip_ring" 
    | "tree"
    | "control_valve"
    | "t_valve"
    | "end_cap";
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[]; // [x1, y1, x2, y2, ...] for pipes
  treeId?: string;   // For drip ring target
  label?: string;
  hp?: number;
  is_booster?: boolean;         // 7.5 HP Inline Subline Booster Motor
  status?: "on" | "off" | "fault";
  diameter_mm?: number;
  dripper_count?: number;       // Number of microsprinklers / holes in the tree loop (default 4)
  dripper_flow_lh?: number;     // Nominal flow rating per hole (L/h)
  valve_state?: "open" | "closed"; // For ON/OFF control valves
  is_end_capped?: boolean;      // For closing line ends
  rotation?: number;            // Rotation angle in degrees (0-360) for scalable pond/components
  capacity_liters?: number;     // Pond water storage capacity in Liters (e.g. 500,000 L)
  current_water_liters?: number; // Current water stored in Pond (Liters)
  fill_rate_lph?: number;       // Inflow rate from Borewells into Pond (L/hr)
  drawdown_rate_lph?: number;   // Outflow rate from Pond via Suction Motor (L/hr)
  nutrient_mix?: string;        // Active fertigation nutrient mix (e.g. "N-P-K 19-19-19")
  injection_rate_lph?: number;  // Fertilizer injection pump rate (L/hr)
  target_ppm?: number;          // Target fertigation concentration (ppm)
  installation_type?: 'submersible' | 'surface_monoblock' | 'inline_surface_booster';
}

export type PlacementTool = 
  | "select" 
  | "borewell" 
  | "motor_7.5hp" 
  | "motor_10hp" 
  | "subline_booster_motor"
  | "pond" 
  | "fertigation_unit" 
  | "main_pipe" 
  | "subline" 
  | "ladder" 
  | "tree_drip_ring" 
  | "tree"
  | "control_valve"
  | "t_valve"
  | "end_cap";

export interface FarmData {
  trees: Tree[];
  pipes: PipeSegment[];
  motors: Motor[];
  boundary: FarmBoundary;
  fertigation_events: FertigationEvent[];
  customComponents?: PlacableComponent[];
}
