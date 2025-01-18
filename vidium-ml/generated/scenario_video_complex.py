import movis as mv

# Create composition
video_width = 1920
video_height = 1080
scene = mv.layer.Composition(size=(video_width, video_height), duration=6)

element_1 = mv.layer.Video("../api_sample/video_sample/sample0.mp4")
element_1_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(1.0, 1.0), rotation=0, opacity=1)
scene.add_layer(element_1, name="element_1",  transform=element_1_transform , offset=1, start_time=0.0, end_time=1)

element_2 = mv.layer.Image("../api_sample/image_sample/sid.png")
element_2_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(1.0, 1.0), rotation=180, opacity=1)
scene.add_layer(element_2, name="element_2", transform=element_2_transform , offset=1, start_time=0.0, end_time=1)

element_3 = mv.layer.Image("../api_sample/image_sample/doggy.png")
element_3_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(2, 2), rotation=0, opacity=1)
scene.add_layer(element_3, name="element_3", transform=element_3_transform , offset=3, start_time=0.0, end_time=1)

element_4 = mv.layer.Text("HELLO", font_size=50, color="#00ff00")
element_4_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(1.0, 1.0), rotation=0, opacity=0.5)
scene.add_layer(element_4, name="element_4", transform=element_4_transform , offset=1, start_time=0.0, end_time=2)

element_5 = mv.layer.Text("COUCOU", font_size=50, color="#ff0000")
element_5_transform = mv.Transform(position=(960, 250), scale=(1.0, 1.0), rotation=0, opacity=1)
scene.add_layer(element_5, name="element_5", transform=element_5_transform , offset=6, start_time=0.0, end_time=-2)

subtitle_8 = mv.layer.Text("sub", font_size=60, color="#ffffff", font_family="Arial")
subtitle_8_transform = mv.Transform(position=(video_width / 2, video_height - (60 / 2) - 20), scale=(1.0, 1.0), rotation=0, opacity=1.0)
scene.add_layer(subtitle_8, transform=subtitle_8_transform, name="subtitle_8" , offset=4, start_time=0.0, end_time=2)
scene["subtitle_8"].add_effect(mv.effect.DropShadow(offset=5.0, angle=0, color=(0, 0, 0), opacity=1.0))
scene["subtitle_8"].add_effect(mv.effect.DropShadow(offset=5.0, angle=90, color=(0, 0, 0), opacity=1.0))
scene["subtitle_8"].add_effect(mv.effect.DropShadow(offset=5.0, angle=180, color=(0, 0, 0), opacity=1.0))
scene["subtitle_8"].add_effect(mv.effect.DropShadow(offset=5.0, angle=270, color=(0, 0, 0), opacity=1.0))

subtitle_10 = mv.layer.Text("sub2", font_size=60, color="#ffffff", font_family="Arial")
subtitle_10_transform = mv.Transform(position=(video_width / 2, video_height - (60 / 2) - 20), scale=(1.0, 1.0), rotation=0, opacity=1.0)
scene.add_layer(subtitle_10, transform=subtitle_10_transform, name="subtitle_10" , offset=4, start_time=0.0, end_time=2)
scene["subtitle_10"].add_effect(mv.effect.DropShadow(offset=5.0, angle=0, color=(0, 0, 0), opacity=1.0))
scene["subtitle_10"].add_effect(mv.effect.DropShadow(offset=5.0, angle=90, color=(0, 0, 0), opacity=1.0))
scene["subtitle_10"].add_effect(mv.effect.DropShadow(offset=5.0, angle=180, color=(0, 0, 0), opacity=1.0))
scene["subtitle_10"].add_effect(mv.effect.DropShadow(offset=5.0, angle=270, color=(0, 0, 0), opacity=1.0))

element_11 = mv.layer.Text("COUCOU", font_size=50, color="#ff0000")
element_11_transform = mv.Transform(position=(960, 250), scale=(1.0, 1.0), rotation=0, opacity=1)
scene.add_layer(element_11, name="element_11", transform=element_11_transform , offset=6, start_time=0.0, end_time=-2)


# Export video
scene.write_video("generated_video/videoComplexe.mp4")
