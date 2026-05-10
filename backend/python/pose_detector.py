"""
MediaPipe Pose Detection Service
Free and open-source from Google
Detects 33 body landmarks from images
"""

import sys
import json
import base64
from pathlib import Path
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
        
        self.detector = None
        self.pose = None
        self.use_new_api = False

        try:
            # Try new MediaPipe API (0.10.30+)
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
            
            model_path = self._resolve_model_path()
            print(f"🔍 Model path resolved: {model_path}", file=sys.stderr)
            
            if model_path:
                print(f"✅ Model file exists at: {model_path}", file=sys.stderr)
                base_options = self._create_base_options(python, model_path)
                options = vision.PoseLandmarkerOptions(
                    base_options=base_options,
                    running_mode=vision.RunningMode.IMAGE
                )
                self.detector = vision.PoseLandmarker.create_from_options(options)
                self.use_new_api = True
                print("✅ New MediaPipe API initialized successfully!", file=sys.stderr)
            else:
                print("❌ Model file not found in any expected location", file=sys.stderr)

        except (ImportError, AttributeError, Exception) as e:
            print(f"❌ New API failed: {type(e).__name__}: {str(e)}", file=sys.stderr)
            self.detector = None

        if not self.use_new_api:
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
            except AttributeError as error:
                raise ImportError(
                    "MediaPipe Pose not available. Install the pose model file or use a mediapipe build with solutions support."
                ) from error

    def _resolve_model_path(self):
        """Resolve the pose task model from a few safe local locations."""
        script_dir = Path(__file__).resolve().parent
        print(f"🔍 Script directory: {script_dir}", file=sys.stderr)
        
        candidates = [
            script_dir / 'pose_landmarker.task',
            script_dir / 'pose_landmarker_lite.task',
            script_dir / 'models' / 'pose_landmarker.task',
            script_dir / 'models' / 'pose_landmarker_lite.task',
            script_dir.parent / 'models' / 'pose_landmarker.task',
            script_dir.parent / 'models' / 'pose_landmarker_lite.task',
            script_dir.parent / 'pose_landmarker.task',
            script_dir.parent / 'pose_landmarker_lite.task',
        ]

        print(f"🔍 Checking {len(candidates)} candidate paths:", file=sys.stderr)
        for i, candidate in enumerate(candidates, 1):
            exists = candidate.exists()
            status = "✅ FOUND" if exists else "❌ Not found"
            print(f"   {i}. {status}: {candidate}", file=sys.stderr)
            if exists:
                return candidate

        print("❌ No model file found in any location!", file=sys.stderr)
        return None

    def _create_base_options(self, python_tasks, model_path):
        """Create MediaPipe base options and prefer CPU inference on headless hosts."""
        base_options_kwargs = {
            'model_asset_path': str(model_path),
        }

        delegate_type = getattr(python_tasks.BaseOptions, 'Delegate', None)
        cpu_delegate = getattr(delegate_type, 'CPU', None) if delegate_type else None

        if cpu_delegate is not None:
            try:
                return python_tasks.BaseOptions(
                    **base_options_kwargs,
                    delegate=cpu_delegate,
                )
            except (TypeError, ValueError):
                pass

        return python_tasks.BaseOptions(**base_options_kwargs)

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
    if len(sys.argv) >= 2 and sys.argv[1] == '--healthcheck':
        try:
            detector = PoseDetector()
            detector.cleanup()
            print(json.dumps({
                'success': True,
                'ready': True
            }))
            sys.exit(0)
        except Exception as error:
            print(json.dumps({
                'success': False,
                'ready': False,
                'error': str(error)
            }))
            sys.exit(0)

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
