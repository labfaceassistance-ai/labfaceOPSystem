
import sys
import os
import cv2
import numpy as np

# Mocking the AI Service Environment
sys.path.append(os.path.abspath('ai-service'))

def test_ensemble_logic():
    from main import calculate_ensemble_confidence, get_hud_guidance
    
    # Test 1: Ensemble Boost
    matches = [
        {'confidence': 90.0, 'angle': 'front'},
        {'confidence': 88.0, 'angle': 'left'}
    ]
    boosted = calculate_ensemble_confidence(matches)
    print(f"Test 1 (Boosted Confidence): {boosted}% (Expected > 90)")
    
    # Test 2: High Confidence No Boost
    matches_high = [{'confidence': 98.0, 'angle': 'right'}]
    boosted_high = calculate_ensemble_confidence(matches_high)
    print(f"Test 2 (High Confidence): {boosted_high}% (Expected 98.0)")

    # Test 3: HUD Guidance (Dark)
    dark_frame = np.zeros((100, 100, 3), dtype=np.uint8)
    code, text = get_hud_guidance(dark_frame, [10, 10, 90, 90])
    print(f"Test 3 (HUD Dark): {code} - {text}")
    
    # Test 4: HUD Guidance (Small Face)
    frame = np.zeros((1000, 1000, 3), dtype=np.uint8)
    frame.fill(128) # Neutral gray
    code_small, text_small = get_hud_guidance(frame, [10, 10, 50, 50])
    print(f"Test 4 (HUD Small): {code_small} - {text_small}")

if __name__ == "__main__":
    try:
        test_ensemble_logic()
    except Exception as e:
        print(f"Error: {e}")
