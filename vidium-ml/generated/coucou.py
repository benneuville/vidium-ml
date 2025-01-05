import movis as mv

# Create composition
scene = mv.layer.Composition(size=(1920, 1080), duration=5.0)

element_1 = mv.layer.Text("Hello World", font_size=30, color="#FF0000")
element_1_transform = mv.Transform(position=(400, 200), scale=(1.0, 1.0), rotation=20.0, opacity=1)
element_1_item = mv.layer.LayerItem(element_1, offset=1.0, start_time=0, end_time=4)
# element_1_item.transform = element_1_transform
# element_1_item.offset = 2.0
scene.add_layer(element_1_item, name="layer1", transform=element_1_transform, offset=1.0)
# Export video
print(scene)
# scene.layers[0].offset = 1.0
scene.write_video("generated_video/coucou.mp4")