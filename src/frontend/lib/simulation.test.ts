import { runHydraulicSimulation } from './simulation';
import { FarmData } from '../types/farm';

describe('Hydraulic Simulation Engine', () => {
  it('calculates lower pressure at end-of-line trees compared to motor-adjacent trees', () => {
    const mockData: FarmData = {
      trees: [
        {
          id: 'TREE-NEAR',
          variety: 'Test',
          position: { lat: 0, lng: 0, pixel_x: 0, pixel_y: 0 },
          canopy_radius_m: 3,
          health_index: 1.0,
          grid_row: 0,
          grid_col: 0,
          drip_emitter_id: 'EMITTER-NEAR',
          notes: []
        },
        {
          id: 'TREE-FAR',
          variety: 'Test',
          position: { lat: 0, lng: 0, pixel_x: 0, pixel_y: 0 },
          canopy_radius_m: 3,
          health_index: 1.0,
          grid_row: 0,
          grid_col: 0,
          drip_emitter_id: 'EMITTER-FAR',
          notes: []
        }
      ],
      pipes: [
        {
          id: 'PIPE-1',
          type: 'main',
          from_node_id: 'MOTOR-1',
          to_node_id: 'EMITTER-NEAR',
          diameter_mm: 63,
          length_m: 10
        },
        {
          id: 'PIPE-2',
          type: 'drip_lateral',
          from_node_id: 'EMITTER-NEAR',
          to_node_id: 'EMITTER-FAR',
          diameter_mm: 16,
          length_m: 500 // Large distance to force significant drop
        }
      ],
      motors: [
        {
          id: 'MOTOR-1',
          type: 'borewell_motor',
          hp: 5,
          rated_flow_lpm: 200,
          rated_head_m: 50,
          location: { lat: 0, lng: 0 },
          status: 'on'
        }
      ],
      boundary: { polygon: [], area_acres: 0, features: [] },
      fertigation_events: []
    };

    const result = runHydraulicSimulation(mockData);
    
    const nearPressure = result.treePressures['TREE-NEAR'];
    const farPressure = result.treePressures['TREE-FAR'];

    expect(nearPressure).toBeDefined();
    expect(farPressure).toBeDefined();
    
    // Assert far pressure is less than near pressure
    expect(farPressure).toBeLessThan(nearPressure);
    
    // Far tree should be under pressure due to large distance
    expect(result.underPressureTrees).toContain('TREE-FAR');
  });
});
