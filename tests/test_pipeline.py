import os
import subprocess
import json
import sys
import numpy as np
import cv2
import pytest

def test_pipeline_recovery():
    # 1. Generate synthetic image
    img_size = 500
    grid_spacing = 20
    img = np.zeros((img_size, img_size, 3), dtype=np.uint8)
    
    # Fill with some background
    img[:] = (50, 50, 50)
    
    # Draw green trees
    known_trees = 0
    for y in range(0, img_size, grid_spacing):
        for x in range(0, img_size, grid_spacing):
            # draw green circle
            cv2.circle(img, (x, y), 5, (0, 255, 0), -1)
            known_trees += 1
            
    img_path = "tests/synthetic_farm.png"
    cv2.imwrite(img_path, img)
    
    # 2. Run pipeline
    out_json = "output/trees.json"
    cmd = [
        sys.executable, "src/backend/pipeline.py",
        "--image", img_path,
        "--grid-spacing", str(grid_spacing),
        "--out", out_json
    ]
    subprocess.run(cmd, check=True)
    
    # 3. Assert >95% recovery
    assert os.path.exists(out_json), "Output JSON not created"
    
    with open(out_json, "r") as f:
        trees = json.load(f)
        
    recovered = len(trees)
    recovery_rate = recovered / known_trees if known_trees > 0 else 0
    
    print(f"Known trees: {known_trees}, Recovered: {recovered}, Rate: {recovery_rate:.2%}")
    assert recovery_rate > 0.95, f"Recovery rate {recovery_rate:.2%} is below 95%"
