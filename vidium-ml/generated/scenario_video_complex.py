import movis as mv

# Create composition
video_width = 1920
video_height = 1080
scene = mv.layer.Composition(size=(video_width, video_height), duration=18.088345)

element_0 = mv.layer.Video("../api_sample/video_sample/sample0.mp4")
element_0_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(1.0, 1.0), rotation=0, opacity=1)
scene.add_layer(element_0, name="element_0",  transform=element_0_transform , offset=0, start_time=0.0, end_time=18.088345)

element_1 = mv.layer.Image("../api_sample/image_sample/sid.png")
element_1_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(1.0, 1.0), rotation=180, opacity=1)
scene.add_layer(element_1, name="element_1", transform=element_1_transform , offset=1, start_time=0.0, end_time=1)

element_2 = mv.layer.Image("../api_sample/image_sample/doggy.png")
element_2_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(2, 2), rotation=0, opacity=1)
scene.add_layer(element_2, name="element_2", transform=element_2_transform , offset=3, start_time=0.0, end_time=1)

element_3 = mv.layer.Text("HELLO", font_size=50, color="#00ff00")
element_3_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(1.0, 1.0), rotation=0, opacity=0.5)
scene.add_layer(element_3, name="element_3", transform=element_3_transform , offset=1, start_time=0.0, end_time=2)

element_4 = mv.layer.Text("COUCOU", font_size=50, color="#ff0000")
element_4_width = element_4.get_size()[0]
element_4_height = element_4.get_size()[1]
element_4_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(2, 2), rotation=0, opacity=0.3)
scene.add_layer(element_4, name="element_4", transform=element_4_transform , offset=2, start_time=0.0, end_time=2)

element_5 = mv.layer.Text("COUCOU", font_size=50, color="#ff0000")
element_5_width = element_5.get_size()[0]
element_5_height = element_5.get_size()[1]
element_5_transform = mv.Transform(position=(video_width/2, video_height/2), scale=(2, 2), rotation=0, opacity=0.3)
scene.add_layer(element_5, name="element_5", transform=element_5_transform , offset=2, start_time=0.0, end_time=2)


# Export video
scene.write_video("generated_video/videoComplexe.mp4")
