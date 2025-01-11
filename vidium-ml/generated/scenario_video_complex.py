import movis as mv

# Create composition
video_width = 1920
video_height = 1080
scene = mv.layer.Composition(size=(video_width, video_height), duration=5.0)

element_0 = mv.layer.Video("../api_sample/video_sample/sample0.mp4")
element_0_transform = mv.Transform(position=(1920/2, 1080/2), scale=(1.0, 1.0), rotation=0, opacity=1)
element_0_item = mv.layer.LayerItem(element_0)
scene.add_layer(element_0_item, transform=element_0_transform)

element_1 = mv.layer.Image("../api_sample/image_sample/sid.png")
element_1_transform = mv.Transform(position=(1920/2, 1080/2), scale=(1.0, 1.0), rotation=180, opacity=1)
element_1_item = mv.layer.LayerItem(element_1, offset=1, end_time=2)
scene.add_layer(element_1_item, transform=element_1_transform)

element_2 = mv.layer.Image("../api_sample/image_sample/doggy.png")
element_2_transform = mv.Transform(position=(1920/2, 1080/2), scale=(2, 2), rotation=0, opacity=1)
element_2_item = mv.layer.LayerItem(element_2, offset=3, end_time=4)
scene.add_layer(element_2_item, transform=element_2_transform)

element_3 = mv.layer.Text("HELLO", font_size=50, color="#00ff00")
element_3_transform = mv.Transform(position=(1920/2, 1080/2), scale=(1.0, 1.0), rotation=0, opacity=0.5)
element_3_start = 1
element_3_end = 1
scene.add_layer(element_3, transform=element_3_transform, offset=element_3_start, end_time=element_3_end)

element_4 = mv.layer.Text("COUCOU", font_size=50, color="#0000ff")
element_4_transform = mv.Transform(position=(960, 250), scale=(1.0, 1.0), rotation=0, opacity=1)
element_4_start = 0
element_4_end = 2
scene.add_layer(element_4, transform=element_4_transform, offset=element_4_start, end_time=element_4_end)

element_6 = mv.layer.Text("COUCOU", font_size=50, color="#ff0000")
element_6_transform = mv.Transform(position=(1920/2, 1080/2), scale=(2, 2), rotation=0, opacity=0.3)
element_6_start = 2
element_6_end = 4
scene.add_layer(element_6, transform=element_6_transform, offset=element_6_start, end_time=element_6_end)


# Add subtitles
font_size = 60
#FUNCTION DECLARATION
position_x = video_width / 2  # Centré horizontalement
position_y = video_height - (font_size / 2) - 20
subtitle_0 = mv.layer.Text("sub1", font_size=font_size, color="#ffffff", font_family="Arial")
subtitle_0_transform = mv.Transform(position=(position_x, position_y), scale=(1.0, 1.0), rotation=0, opacity=1)
subtitle_0_start = 1
subtitle_0_end = 3
scene.add_layer(subtitle_0, transform=subtitle_0_transform, name="subtitle_0", offset=subtitle_0_start, end_time=subtitle_0_end)
scene["subtitle_0"].add_effect(mv.effect.DropShadow(offset=5.0, angle=0, color=(0, 0, 0), opacity=1.0))
scene["subtitle_0"].add_effect(mv.effect.DropShadow(offset=5.0, angle=90, color=(0, 0, 0), opacity=1.0))
scene["subtitle_0"].add_effect(mv.effect.DropShadow(offset=5.0, angle=180, color=(0, 0, 0), opacity=1.0))
scene["subtitle_0"].add_effect(mv.effect.DropShadow(offset=5.0, angle=270, color=(0, 0, 0), opacity=1.0))

# Export video
scene.write_video("generated_video/videoComplexe.mp4")
