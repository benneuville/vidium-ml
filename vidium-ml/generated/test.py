import movis as mv
from PIL import Image

size = (640, 480)
duration = 5.0

original_image = Image.open("../api_sample/image_sample/sid.png")
resized_image = original_image.resize((800, 600))  # Resize to 800x600

scene = mv.layer.Composition(size, duration=duration)

scene.add_layer(
    mv.layer.Rectangle(size, color=(127, 127, 127), duration=duration),
    name='bg')
rectangle = mv.layer.Rectangle(
    size=(10, 10),
    contents=[
        mv.layer.FillProperty(color=(255, 83, 49)),
        mv.layer.StrokeProperty(color=(255, 255, 255), width=5),
    ],
    duration=duration)
scene.add_layer(rectangle, name='rect')

rectangle.size.enable_motion().extend(
    keyframes=[0, 1, 2, 3, 4],
    values=[(0, 0), (100, 25), (200, 50), (300, 75), (400, 100)],
    easings=['linear'] * 5)
# scene['rect'].rotation.enable_motion().extend(
#    keyframes=[0, 1, 2, 3, 4],
#    values=[0, 90, 180, 0, 0],
#    easings=['ease_out5'] * 5)

element_1 = mv.layer.media.Image(resized_image)
element_1_transform = mv.Transform(position=(1920/2, 1080/2), scale=(1.0, 1.0), rotation=0, opacity=1)
element_1_item = mv.layer.LayerItem(element_1, offset=1, start_time=0.0, end_time=2)
scene.add_layer(element_1_item, transform=element_1_transform)


scene.write_video('generated_video/output.mp4')
