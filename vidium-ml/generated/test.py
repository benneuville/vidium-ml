
import movis as mv

# Video Composition
scene = mv.layer.Composition(size=(1920, 1080), duration=60)

# Define Assets
asset_rect1 = mv.layer.Rectangle(
                    size=(100, 200), 
                    color=(255, 0, 0),
                )
asset_clip1 = mv.layer.Video("api_sample/video_sample/sample3.mp4")


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
scene.write_video('output.mp4')
    