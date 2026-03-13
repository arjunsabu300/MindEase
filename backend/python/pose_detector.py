"""
MediaPipe Pose Detection Service
Free and open-source from Google
Detects 33 body landmarks from images
"""

import sys
import json
import base64
from io import BytesIO

try:
    import cv2
    import mediapipe as mp
    import numpy as np
    from PIL import Image
    MEDIAPIPE_AVAILABLE = True
except ImportError as e:
    MEDIAPIPE_AVAILABLE = False
    IMPORT_ERROR = str(e)

class PoseDetector:
    def __init__(self):
        """Initialize MediaPipe Pose"""
        if not MEDIAPIPE_AVAILABLE:
            raise ImportError(f"MediaPipe dependencies not available: {IMPORT_ERROR}")
        
        try:
            # Try new MediaPipe API (0.10.30+)
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
            
            # Use new task-based API
            base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.IMAGE
            )
            self.detector = vision.PoseLandmarker.create_from_options(options)
            self.use_new_api = True
            
        except (ImportError, AttributeError, Exception):
            # Fallback to legacy API (0.10.9 and earlier)
            try:
                self.mp_pose = mp.solutions.pose
                self.pose = self.mp_pose.Pose(
                    static_image_mode=True,
                    model_complexity=2,
                    enable_segmentation=False,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                self.use_new_api = False
            except AttributeError:
                raise ImportError("MediaPipe Pose not available. Please reinstall: pip install mediapipe")
        
    def detect_from_file(self, image_path):
        """
        Detect pose from image file
        Returns 33 landmarks in normalized coordinates (0-1)
        """
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                return {
                    'success': False,
                    'error': 'Failed to read image'
                }
            
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Process image based on API version
            if self.use_new_api:
                # New API (0.10.30+)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
                detection_result = self.detector.detect(mp_image)
                
                if not detection_result.pose_landmarks:
                    return {
                        'success': True,
                        'detected': False,
                        'landmarks': None,
                        'message': 'No pose detected in image'
                    }
                
                # Extract landmarks from new API
                landmarks = []
                for landmark in detection_result.pose_landmarks[0]:
                    landmarks.append({
                        'x': float(landmark.x),
                        'y': float(landmark.y),
                        'z': float(landmark.z),
                        'visibility': float(landmark.visibility) if hasattr(landmark, 'visibility') else 1.0
                    })
            else:
                # Legacy API
                results = self.pose.process(image_rgb)
                
                if not results.pose_landmarks:
                    return {
                        'success': True,
                        'detected': False,
                        'landmarks': None,
                        'message': 'No pose detected in image'
                    }
                
                # Extract landmarks from legacy API
                landmarks = []
                for landmark in results.pose_landmarks.landmark:
                    landmarks.append({
                        'x': float(landmark.x),
                        'y': float(landmark.y),
                        'z': float(landmark.z),
                        'visibility': float(landmark.visibility)
                    })
            
            return {
                'success': True,
                'detected': True,
                'landmarks': landmarks,
                'imageWidth': image.shape[1],
                'imageHeight': image.shape[0],
                'landmarkCount': len(landmarks)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_from_base64(self, base64_string):
        """
        Detect pose from base64 encoded image
        """
        try:
            # Decode base64
            image_data = base64.b64decode(base64_string)
            image = Image.open(BytesIO(image_data))
            
            # Convert to numpy array
            image_np = np.array(image)
            
            # Convert to RGB if needed
            if len(image_np.shape) == 2:
                image_rgb = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
            elif image_np.shape[2] == 4:
                image_rgb = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)
            else:
                image_rgb = image_np
            
            # Process image based on API version
            if self.use_new_api:
                # New API
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
                detection_result = self.detector.detect(mp_image)
                
                if not detection_result.pose_landmarks:
                    return {
                        'success': True,
                        'detected': False,
                        'landmarks': None,
                        'message': 'No pose detected in image'
                    }
                
                landmarks = []
                for landmark in detection_result.pose_landmarks[0]:
                    landmarks.append({
                        'x': float(landmark.x),
                        'y': float(landmark.y),
                        'z': float(landmark.z),
                        'visibility': float(landmark.visibility) if hasattr(landmark, 'visibility') else 1.0
                    })
            else:
                # Legacy API
                results = self.pose.process(image_rgb)
                
                if not results.pose_landmarks:
                    return {
                        'success': True,
                        'detected': False,
                        'landmarks': None,
                        'message': 'No pose detected in image'
                    }
                
                landmarks = []
                for landmark in results.pose_landmarks.landmark:
                    landmarks.append({
                        'x': float(landmark.x),
                        'y': float(landmark.y),
                        'z': float(landmark.z),
                        'visibility': float(landmark.visibility)
                    })
            
            return {
                'success': True,
                'detected': True,
                'landmarks': landmarks,
                'imageWidth': image_np.shape[1],
                'imageHeight': image_np.shape[0],
                'landmarkCount': len(landmarks)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def cleanup(self):
        """Clean up resources"""
        if hasattr(self, 'pose') and self.pose:
            self.pose.close()
        if hasattr(self, 'detector') and self.detector:
            self.detector.close()

def main():
    """
    Command line interface
    Usage: python pose_detector.py <image_path>
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No image path provided'
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    detector = PoseDetector()
    result = detector.detect_from_file(image_path)
    detector.cleanup()
    
    # Output JSON result
    print(json.dumps(result))

if __name__ == '__main__':
    main()

# Made with Bob
