import movis as mv

# Create composition
scene = mv.layer.Composition(size=(1920, 1080), duration=60)

element_0 = mv.layer.Video("sample0")
element_0 = mv.trim(element_0, start_times=[0], end_times=[2])
scene.add_layer(element_0)

# Export video
scene.write_video("maVideoAsset.mp4")
