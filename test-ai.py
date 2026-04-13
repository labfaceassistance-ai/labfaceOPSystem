import cv2
from insightface.app import FaceAnalysis

img_path = r"/app/test-media.jpg"
img = cv2.imread(img_path)

if img is None:
    print('Failed to load image')
    exit()

print(f'Image shape: {img.shape}')

app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.1)

faces = app.get(img)
for i, f in enumerate(faces):
    print(f'Face {i}: bbox {f.bbox}, det_score {f.det_score}')
