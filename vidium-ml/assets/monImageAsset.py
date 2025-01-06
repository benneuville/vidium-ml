import movis as mv
import cv2

# Create composition
scene = mv.layer.Composition(size=(1920, 1080), duration=1)

element_0 = mv.layer.Image("../../api_sample/image_sample/sid.png")
scene.add_layer(element_0)

# Export image
frame = scene.render(time=0)
cv2.imwrite("monImageAsset.png", frame)
