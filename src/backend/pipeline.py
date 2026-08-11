import argparse
import json
import math
from typing import List, Dict, Any, Tuple
import cv2
import numpy as np
from shapely.geometry import Point, Polygon
import os

def load_deepforest_model():
    """Fallback hook for DeepForest model."""
    pass

def detect_canopies_baseline(image_path: str) -> List[Tuple[int, int, float]]:
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_green = np.array([30, 40, 40])
    upper_green = np.array([90, 255, 255])
    mask = cv2.inRange(hsv, lower_green, upper_green)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    detections = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 5:
            (x, y), radius = cv2.minEnclosingCircle(cnt)
            detections.append((int(x), int(y), float(radius)))

    return detections

def non_max_suppression(detections: List[Tuple[int, int, float]], min_distance: float) -> List[Tuple[int, int, float]]:
    if not detections:
        return []
        
    detections = sorted(detections, key=lambda x: x[2], reverse=True)
    keep = []
    
    for det in detections:
        x, y, r = det
        overlap = False
        for kx, ky, kr in keep:
            dist = math.hypot(x - kx, y - ky)
            if dist < min_distance:
                overlap = True
                break
        if not overlap:
            keep.append(det)
            
    return keep

def get_farm_boundary_and_corridors(img_w: int, img_h: int) -> Tuple[Polygon, List[Polygon]]:
    # Boundary: irregular
    boundary = Polygon([(0, 0), (img_w, 0), (img_w, img_h), (0, img_h)])
    # Corridors
    corridors = []
    return boundary, corridors

def grid_snap(detections: List[Tuple[int, int, float]], grid_spacing: float, boundary: Polygon, corridors: List[Polygon]) -> List[Dict[str, Any]]:
    trees = []
    minx, miny, maxx, maxy = boundary.bounds
    
    grid_points = {}
    for r_idx, y in enumerate(np.arange(miny, maxy, grid_spacing)):
        for c_idx, x in enumerate(np.arange(minx, maxx, grid_spacing)):
            pt = Point(x, y)
            if boundary.covers(pt) and not any(c.covers(pt) for c in corridors):
                grid_points[(c_idx, r_idx)] = (x, y)
                    
    tree_idx = 1
    # Match grid points to closest detection
    for grid_coord, (gx, gy) in grid_points.items():
        best_dist = float('inf')
        best_r = 0.0
        for x, y, r in detections:
            dist = math.hypot(x - gx, y - gy)
            if dist < best_dist and dist < grid_spacing * 0.8: # Snap threshold
                best_dist = dist
                best_r = r
                
        if best_dist != float('inf'):
            trees.append({
                "id": f"TREE-{tree_idx:04d}",
                "variety": "Unknown",
                "position": {
                    "lat": 0.0,
                    "lng": 0.0,
                    "pixel_x": int(gx),
                    "pixel_y": int(gy)
                },
                "canopy_radius_m": best_r,
                "health_index": 1.0,
                "grid_row": grid_coord[1],
                "grid_col": grid_coord[0],
                "notes": []
            })
            tree_idx += 1
            
    return trees

def save_geojson(trees: List[Dict[str, Any]], out_path: str):
    features = []
    for t in trees:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [t["position"]["pixel_x"], t["position"]["pixel_y"]]
            },
            "properties": {
                "id": t["id"],
                "variety": t["variety"]
            }
        })
    with open(out_path, 'w') as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, indent=2)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--grid-spacing", type=float, required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    detections = detect_canopies_baseline(args.image)
    detections = non_max_suppression(detections, args.grid_spacing * 0.5)
    
    img = cv2.imread(args.image)
    h, w = img.shape[:2]
    boundary, corridors = get_farm_boundary_and_corridors(w, h)
    
    trees = grid_snap(detections, args.grid_spacing, boundary, corridors)
    
    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
    with open(args.out, 'w') as f:
        json.dump(trees, f, indent=2)
        
    save_geojson(trees, args.out.rsplit('.', 1)[0] + '.geojson')

if __name__ == "__main__":
    main()
