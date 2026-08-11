import json
import os

schemas = {
    "Tree.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Tree",
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "variety": {"type": "string"},
            "planted_date": {"type": "string"},
            "age_years": {"type": "number"},
            "last_yield_date": {"type": "string"},
            "position": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lng": {"type": "number"},
                    "pixel_x": {"type": "number"},
                    "pixel_y": {"type": "number"}
                },
                "required": ["lat", "lng", "pixel_x", "pixel_y"]
            },
            "canopy_radius_m": {"type": "number"},
            "health_index": {"type": "number"},
            "grid_row": {"type": "number"},
            "grid_col": {"type": "number"},
            "drip_emitter_id": {"type": "string"},
            "notes": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["id", "variety", "position", "canopy_radius_m", "health_index", "grid_row", "grid_col", "notes"]
    },
    "PipeSegment.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "PipeSegment",
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "type": {"type": "string", "enum": ["main", "sub", "drip_lateral"]},
            "from_node_id": {"type": "string"},
            "to_node_id": {"type": "string"},
            "diameter_mm": {"type": "number"},
            "length_m": {"type": "number"},
            "material": {"type": "string"}
        },
        "required": ["id", "type", "from_node_id", "to_node_id", "diameter_mm", "length_m"]
    },
    "Motor.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Motor",
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "type": {"type": "string", "enum": ["borewell_motor", "pump"]},
            "hp": {"type": "number"},
            "rated_flow_lpm": {"type": "number"},
            "rated_head_m": {"type": "number"},
            "location": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lng": {"type": "number"}
                },
                "required": ["lat", "lng"]
            },
            "status": {"type": "string", "enum": ["on", "off", "fault"]}
        },
        "required": ["id", "type", "hp", "rated_flow_lpm", "rated_head_m", "location", "status"]
    },
    "FarmBoundary.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "FarmBoundary",
        "type": "object",
        "properties": {
            "polygon": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "lat": {"type": "number"},
                        "lng": {"type": "number"}
                    },
                    "required": ["lat", "lng"]
                }
            },
            "area_acres": {"type": "number"},
            "features": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": ["pond", "house", "borewell"]},
                        "position": {
                            "type": "object",
                            "properties": {
                                "lat": {"type": "number"},
                                "lng": {"type": "number"}
                            },
                            "required": ["lat", "lng"]
                        },
                        "label": {"type": "string"}
                    },
                    "required": ["type", "position", "label"]
                }
            }
        },
        "required": ["polygon", "area_acres", "features"]
    },
    "FertigationEvent.schema.json": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "FertigationEvent",
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "injector_id": {"type": "string"},
            "nutrient_mix": {"type": "string"},
            "start_time": {"type": "string"},
            "duration_min": {"type": "number"},
            "dosing_rate_lph": {"type": "number"}
        },
        "required": ["id", "injector_id", "nutrient_mix", "start_time", "duration_min", "dosing_rate_lph"]
    }
}

os.makedirs("src/schemas", exist_ok=True)
for name, schema in schemas.items():
    with open(f"src/schemas/{name}", "w") as f:
        json.dump(schema, f, indent=2)

print("Created JSON schemas.")
