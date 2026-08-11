from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class Position(BaseModel):
    lat: float
    lng: float
    pixel_x: float
    pixel_y: float

class Location(BaseModel):
    lat: float
    lng: float

class Tree(BaseModel):
    id: str
    variety: str
    planted_date: Optional[str] = None
    age_years: Optional[float] = None
    last_yield_date: Optional[str] = None
    position: Position
    canopy_radius_m: float
    health_index: float = Field(ge=0, le=1)
    grid_row: int
    grid_col: int
    drip_emitter_id: Optional[str] = None
    notes: List[str]

class PipeSegment(BaseModel):
    id: str
    type: Literal["main", "sub", "drip_lateral"]
    from_node_id: str
    to_node_id: str
    diameter_mm: float
    length_m: float
    material: Optional[str] = None

class Motor(BaseModel):
    id: str
    type: Literal["borewell_motor", "pump"]
    hp: float
    rated_flow_lpm: float
    rated_head_m: float
    location: Location
    status: Literal["on", "off", "fault"]

class Feature(BaseModel):
    type: Literal["pond", "house", "borewell"]
    position: Location
    label: str

class FarmBoundary(BaseModel):
    polygon: List[Location]
    area_acres: float
    features: List[Feature]

class FertigationEvent(BaseModel):
    id: str
    injector_id: str
    nutrient_mix: str
    start_time: str
    duration_min: float
    dosing_rate_lph: float

class FarmData(BaseModel):
    trees: List[Tree]
    pipes: List[PipeSegment]
    motors: List[Motor]
    boundary: FarmBoundary
    fertigation_events: List[FertigationEvent]
