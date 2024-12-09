import movis as mv

scene = mv.layer.Composition(size=(1920, 1080), duration=5.0)
scene.add_layer(mv.layer.Rectangle(scene.size, color='#000000'))  # Set background

pos = scene.size[0] // 2, scene.size[1] // 2
scene.add_layer(
    mv.layer.Text('Hello World!', font_size=256, font_family='Helvetica', color='#ffffff'),
    name='text',  # The layer item can be accessed by name
    offset=1.0,  # Show the text after one second
    position=pos,  # The layer is centered by default, but it can also be specified explicitly
    anchor_point=(0.0, 0.0),
    opacity=1.0, scale=1.0, rotation=0.0,  # anchor point, opacity, scale, and rotation are also supported
    blending_mode='normal')  # Blending mode can be specified for each layer.
scene['text'].add_effect(mv.effect.DropShadow(offset=10.0))  # Multiple effects can be added.
scene['text'].scale.enable_motion().extend(
    keyframes=[0.0, 1.0], values=[0.0, 1.0], easings=['ease_in_out'])
# Fade-in effect. It means that the text appears fully two seconds later.
scene['text'].opacity.enable_motion().extend([0.0, 1.0], [0.0, 1.0])

scene.write_video('output.mp4')