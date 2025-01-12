
import movis as mv

# Load the media files
video_clip = mp.VideoFileClip("../api_sample/video_sample/sample0.mp4").subclip(0, 1).rotate(45)  # First second of video
first_image = mp.ImageClip("../api_sample/image_sample/sid.png").set_duration(1)   # Show for 1 second
second_image = mp.ImageClip("../api_sample/image_sample/doggy.png").set_duration(1) # Show for 1 second
second_clip = mp.VideoFileClip("../api_sample/video_sample/sample0.mp4").subclip(1, 2)  # First second of video
# Video Composition
scene = mv.layer.Composition(size=(1920, 1080), duration=60)

# Define Assets
asset_rect1 = mv.layer.Rectangle(
                    size=(100, 200),
                    color=(255, 0, 0),
                )
asset_clip1 = mv.layer.Video("../api_sample/video_sample/sample3.mp4")
asset_clip1 = mv.trim(asset_clip1, start_times=[1], end_times=[5])

# Define Layers
layer_layer1 = mv.layer.Composition(
    size=(1920, 1080),
    duration=10
)
layer_layer1.add_layer(asset_rect1)
layer_layer2 = mv.layer.Composition(
    size=(1920, 1080),
    duration=20
)
layer_layer2.add_layer(asset_clip1)
layer_layer2.add_layer(layer_layer1)

# Compose Sequences
scene.add_layer(layer_layer1)
scene.add_layer(layer_layer2)

# Export Video
scene.write_video('generated_video/maVideo.mp4')
