import cv2
import numpy as np
import json
import os
from scipy.spatial import cKDTree

def main():
    img_path = 'src/frontend/public/farm_background.png'
    if not os.path.exists(img_path):
        img_path = '/Users/abhay/Downloads/Gemini_Generated_Image_j1r0zrj1r0zrj1r0.png'

    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f"Could not load image from {img_path}")

    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # ---- 1. Extract farm boundary polygon from purple outline ----
    purple_mask = cv2.inRange(hsv, (120, 80, 80), (160, 255, 255))
    ys_p, xs_p = np.where(purple_mask > 0)
    purple_pts = np.column_stack([xs_p, ys_p]).astype(np.int32)
    hull = cv2.convexHull(purple_pts)

    boundary_mask = np.zeros((h, w), np.uint8)
    cv2.fillConvexPoly(boundary_mask, hull, 255)

    # ---- 2. Red marker detection ----
    lower1 = np.array([0, 120, 120]);   upper1 = np.array([10, 255, 255])
    lower2 = np.array([170, 120, 120]); upper2 = np.array([180, 255, 255])
    red_mask = cv2.inRange(hsv, lower1, upper1) | cv2.inRange(hsv, lower2, upper2)

    kernel = np.ones((3, 3), np.uint8)
    clean = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, kernel, iterations=1)
    clean = cv2.morphologyEx(clean, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    records = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < 3:
            continue
        perim = cv2.arcLength(c, True)
        circ = 4 * np.pi * area / (perim * perim) if perim > 0 else 0
        M = cv2.moments(c)
        if M['m00'] == 0:
            continue
        cx, cy = M['m10'] / M['m00'], M['m01'] / M['m00']
        records.append(dict(area=area, circ=circ, cx=cx, cy=cy))

    AREA_MIN, AREA_MAX = 20, 900
    CIRC_MIN = 0.45

    candidates = []
    for r in records:
        if not (AREA_MIN <= r['area'] <= AREA_MAX and r['circ'] >= CIRC_MIN):
            continue
        if boundary_mask[int(r['cy']), int(r['cx'])] == 0:
            continue
        candidates.append(r)

    print(f"Raw red blobs: {len(records)} -> Filtered inside boundary: {len(candidates)}")

    # ---- 3. Stable row-band reading order (top-to-bottom, left-to-right) ----
    pts = np.array([[r['cx'], r['cy']] for r in candidates])
    kd_tree = cKDTree(pts)
    dists, _ = kd_tree.query(pts, k=2)
    nn_dist = np.median(dists[:, 1])
    row_band = max(nn_dist * 0.7, 10)

    band_idx = np.round(pts[:, 1] / row_band).astype(int)
    order = sorted(range(len(candidates)), key=lambda i: (band_idx[i], pts[i, 0]))

    trees = []
    for rank, i in enumerate(order, start=1):
        r = candidates[i]
        cx, cy = round(r['cx'], 1), round(r['cy'], 1)
        trees.append({
            "id": f"TREE-{rank:04d}",
            "variety": "Coconut Tree",
            "planted_date": "2021-03-15",
            "age_years": 5,
            "position": {
                "lat": round(13.985838 + (cy - h/2)*0.000001, 6),
                "lng": round(78.402921 + (cx - w/2)*0.000001, 6),
                "pixel_x": cx,
                "pixel_y": cy
            },
            "canopy_radius_m": 3.2,
            "health_index": 0.95,
            "grid_row": int(cy // 20),
            "grid_col": int(cx // 20),
            "notes": ["Ground truth tree center from Claude OpenCV detection"]
        })

    farm_data = {
        "farm_info": {
            "name": "Madhu Coco Farm Digital Twin",
            "total_trees": len(trees),
            "total_acres": 29.42,
            "center": {"lat": 13.985838, "lng": 78.402921}
        },
        "trees": trees,
        "boundary": {
            "polygon": [],
            "features": []
        },
        "pipes": []
    }

    # Save outputs
    with open('fixtures/farm_data.json', 'w') as f:
        json.dump(farm_data, f, indent=2)

    with open('src/frontend/public/farm_data.json', 'w') as f:
        json.dump(farm_data, f, indent=2)

    print(f"Successfully generated {len(trees)} ground-truth trees in farm_data.json!")

if __name__ == '__main__':
    main()
