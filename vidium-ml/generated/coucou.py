import movis as mv

# Create composition
scene = mv.layer.Composition(size=(1920, 1080), duration=5.0)

element_0 = mv.layer.Video("../api_sample/video_sample/sample0.mp4")
element_0_transform = mv.Transform(position=(1920 / 2, 1080 / 2), scale=(1.0, 1.0), rotation=0, opacity=1)
scene.add_layer(element_0, transform=element_0_transform, offset=0, start_time=0.0, end_time=2.5)

element_0 = mv.layer.Video("../api_sample/video_sample/sample1.mp4")
element_0_transform = mv.Transform(position=(1920 / 2, 1080 / 2), scale=(2, 2), rotation=0, opacity=1)
scene.add_layer(element_0, transform=element_0_transform, offset=2.5, start_time=0.0, end_time=2.5)

duration = 1
sizes = [(0, 0), (1920, 1080), (0, 0)]

transition = mv.layer.Rectangle(size=(1920, 1080), color="#000000")
item = scene.add_layer(transition, offset=2)
# transition.size.enable_motion().extend([0, duration/2, duration], [sizes[0], sizes[1], sizes[2]], ['ease_out', 'ease_in'])
item.opacity.enable_motion().extend([0, duration/2, duration], [0, 1, 0], ['ease_out', 'ease_in'])

# Export video
scene.write_video("generated_video/videoScenarioSimple.mp4")
