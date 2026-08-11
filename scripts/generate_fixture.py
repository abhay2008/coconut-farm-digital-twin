import json
import os
import uuid
import math
import random
from datetime import datetime
import numpy as np
from shapely.geometry import Point, Polygon, LineString, box

BASE_LAT = 12.9716
BASE_LNG = 77.5946

# 1 degree is roughly 111,111 meters
DEG_TO_M = 111111.0

# 25 acres = 101171 sq m
# Use a bounding box of roughly 400m x 400m
WIDTH_M = 400.0
HEIGHT_M = 400.0

def offset_to_latlng(x_m, y_m):
    # Origin top-left. Lat decreases as y increases (going south). Lng increases as x increases (going east).
    dlat = -y_m / DEG_TO_M
    dlng = x_m / (DEG_TO_M * math.cos(math.radians(BASE_LAT)))
    return BASE_LAT + dlat, BASE_LNG + dlng

def main():
    print("Generating fixture data...")
    
    # NORMALIZED COORDINATES (0-1) - Eyeballed placeholders as per spec
    boundary_norm = [
        (0.2, 0.0), (0.6, 0.05), (0.9, 0.2), (1.0, 0.6), (0.8, 1.0),
        (0.3, 1.0), (0.1, 0.8), (0.0, 0.5), (0.1, 0.3), (0.2, 0.1)
    ]
    # Notch top-left for pond/house
    
    pond_box = box(0.05, 0.15, 0.17, 0.33)
    house_box = box(0.01, 0.33, 0.09, 0.46)
    sparse_box = box(0.30, 0.15, 0.45, 0.30)
    
    road_line = LineString([(0.35, 1.0), (0.5, 0.65), (0.8, 0.3), (0.95, 0.02)])
    
    # Scale to meters
    boundary_poly = Polygon([(x * WIDTH_M, y * HEIGHT_M) for x, y in boundary_norm])
    pond_poly = Polygon([(x * WIDTH_M, y * HEIGHT_M) for x, y in pond_box.exterior.coords])
    house_poly = Polygon([(x * WIDTH_M, y * HEIGHT_M) for x, y in house_box.exterior.coords])
    sparse_poly = Polygon([(x * WIDTH_M, y * HEIGHT_M) for x, y in sparse_box.exterior.coords])
    road_m = LineString([(x * WIDTH_M, y * HEIGHT_M) for x, y in road_line.coords])
    road_buffer = road_m.buffer(5.0) # 10m wide road corridor
    
    boundary_latlng = [offset_to_latlng(x, y) for x, y in boundary_poly.exterior.coords]
    
    farm_data = {
        "trees": [],
        "pipes": [],
        "motors": [],
        "boundary": {
            "polygon": [{"lat": lat, "lng": lng} for lat, lng in boundary_latlng],
            "area_acres": boundary_poly.area / 4046.86,
            "features": []
        },
        "fertigation_events": []
    }
    
    # Features
    pond_center = pond_poly.centroid
    farm_data["boundary"]["features"].append({
        "type": "pond",
        "position": {"lat": offset_to_latlng(pond_center.x, pond_center.y)[0], "lng": offset_to_latlng(pond_center.x, pond_center.y)[1]},
        "label": "Main Pond"
    })
    
    house_center = house_poly.centroid
    farm_data["boundary"]["features"].append({
        "type": "house",
        "position": {"lat": offset_to_latlng(house_center.x, house_center.y)[0], "lng": offset_to_latlng(house_center.x, house_center.y)[1]},
        "label": "Farm House"
    })
    
    # Borewells
    borewells_m = []
    for _ in range(7):
        while True:
            px = random.uniform(0, WIDTH_M)
            py = random.uniform(0, HEIGHT_M)
            pt = Point(px, py)
            if boundary_poly.contains(pt) and not pond_poly.contains(pt) and not house_poly.contains(pt) and not road_buffer.contains(pt):
                borewells_m.append(pt)
                break
                
    for i, bw in enumerate(borewells_m):
        lat, lng = offset_to_latlng(bw.x, bw.y)
        farm_data["boundary"]["features"].append({
            "type": "borewell",
            "position": {"lat": lat, "lng": lng},
            "label": f"Borewell {i+1}"
        })
        farm_data["motors"].append({
            "id": f"MOTOR-{i+1}",
            "type": "borewell_motor",
            "hp": random.uniform(5.0, 10.0),
            "rated_flow_lpm": 200.0,
            "rated_head_m": 50.0,
            "location": {"lat": lat, "lng": lng},
            "status": "off"
        })
    
    # Generate Trees using extracted tree centers if available, else synthetic grid
    grid_spacing = 7.5
    trees = []
    tree_id_counter = 1
    
    extracted_file = "fixtures/extracted_tree_centers.json"
    if os.path.exists(extracted_file):
        print(f"Loading tree centers from {extracted_file}...")
        with open(extracted_file) as ef:
            ext_data = json.load(ef)
        img_w = ext_data["image_width"]
        img_h = ext_data["image_height"]
        
        for px, py in ext_data["centers"]:
            nx = px / img_w
            ny = py / img_h
            x_m = nx * WIDTH_M
            y_m = ny * HEIGHT_M
            lat, lng = offset_to_latlng(x_m, y_m)
            grid_col = int(round(x_m / 7.5))
            grid_row = int(round(y_m / 7.5))
            
            trees.append({
                "id": f"TREE-{tree_id_counter:04d}",
                "variety": "Tall x Dwarf",
                "planted_date": "2018-06-01",
                "age_years": 8.0,
                "position": {
                    "lat": lat,
                    "lng": lng,
                    "pixel_x": round(px, 1),
                    "pixel_y": round(py, 1)
                },
                "canopy_radius_m": 3.0,
                "health_index": round(random.uniform(0.75, 0.98), 2),
                "grid_row": grid_row,
                "grid_col": grid_col,
                "drip_emitter_id": f"EMITTER-{tree_id_counter:04d}",
                "notes": []
            })
            tree_id_counter += 1
    else:
        grid_spacing = 7.5
        cols = int(WIDTH_M / grid_spacing)
        rows = int(HEIGHT_M / grid_spacing)
        
        for r in range(rows):
            for c in range(cols):
                x = c * grid_spacing
                y = r * grid_spacing
                pt = Point(x, y)
                
                if not boundary_poly.contains(pt):
                    continue
                if road_buffer.contains(pt) or pond_poly.contains(pt) or house_poly.contains(pt):
                    continue
                    
                prob = 1.0
                dist_to_boundary = boundary_poly.exterior.distance(pt)
                if dist_to_boundary < 10:
                    prob *= 0.5
                dist_to_road = road_m.distance(pt)
                if dist_to_road < 15:
                    prob *= 0.7
                if sparse_poly.contains(pt):
                    prob *= 0.1
                    
                if random.random() > prob:
                    continue
                    
                lat, lng = offset_to_latlng(x, y)
                
                trees.append({
                    "id": f"TREE-{tree_id_counter:04d}",
                    "variety": "Tall x Dwarf",
                    "planted_date": "2018-06-01",
                    "age_years": 8.0,
                    "position": {
                        "lat": lat,
                        "lng": lng,
                        "pixel_x": x,
                        "pixel_y": y
                    },
                    "canopy_radius_m": 3.0,
                    "health_index": random.uniform(0.7, 1.0),
                    "grid_row": r,
                    "grid_col": c,
                    "drip_emitter_id": f"EMITTER-{tree_id_counter:04d}",
                    "notes": []
                })
                tree_id_counter += 1
                
    farm_data["trees"] = trees
    
    # Generate simple pipe network
    # One main line from the first borewell
    if borewells_m:
        main_motor = farm_data["motors"][0]
        farm_data["pipes"].append({
            "id": "PIPE-MAIN-1",
            "type": "main",
            "from_node_id": main_motor["id"],
            "to_node_id": "JUNCTION-1",
            "diameter_mm": 90.0,
            "length_m": 100.0,
            "material": "PVC"
        })
        
        # Connect first 10 trees to a lateral
        for i, t in enumerate(trees[:10]):
            farm_data["pipes"].append({
                "id": f"PIPE-LATERAL-{i+1}",
                "type": "drip_lateral",
                "from_node_id": "JUNCTION-1" if i == 0 else f"JUNCTION-{i+1}",
                "to_node_id": t["drip_emitter_id"],
                "diameter_mm": 16.0,
                "length_m": grid_spacing,
                "material": "LLDPE"
            })
            if i < 9:
                farm_data["pipes"].append({
                    "id": f"PIPE-SUB-{i+1}",
                    "type": "sub",
                    "from_node_id": "JUNCTION-1" if i == 0 else f"JUNCTION-{i+1}",
                    "to_node_id": f"JUNCTION-{i+2}",
                    "diameter_mm": 32.0,
                    "length_m": grid_spacing,
                    "material": "PVC"
                })
    
    with open("fixtures/farm_data.json", "w") as f:
        json.dump(farm_data, f, indent=2)
        
    print(f"Generated {len(trees)} trees in fixtures/farm_data.json")

if __name__ == "__main__":
    main()
