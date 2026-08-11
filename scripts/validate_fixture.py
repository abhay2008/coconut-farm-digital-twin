import json
import sys
import os

# Add src to path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src", "backend"))

from models.farm import FarmData

def main():
    try:
        with open("fixtures/farm_data.json", "r") as f:
            data = json.load(f)
            
        farm = FarmData(**data)
        print("Validation Successful!")
        print(f"Total Trees: {len(farm.trees)}")
        print(f"Total Pipes: {len(farm.pipes)}")
        print(f"Total Motors: {len(farm.motors)}")
        print(f"Boundary Area (acres): {farm.boundary.area_acres:.2f}")
        print(f"Boundary Features: {len(farm.boundary.features)}")
        
    except Exception as e:
        print(f"Validation Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
