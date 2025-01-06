import moviepy.editor  as mp

# Load the media files
video_clip = mp.VideoFileClip("../api_sample/video_sample/sample0.mp4").subclip(0, 1)  # First second of video
first_image = mp.ImageClip("../api_sample/image_sample/sid.png").set_duration(1)   # Show for 1 second
second_image = mp.ImageClip("../api_sample/image_sample/doggy.png").set_duration(1) # Show for 1 second
second_clip = mp.VideoFileClip("../api_sample/video_sample/sample0.mp4").subclip(1, 2)  # First second of video

# Make sure all clips match the same size (e.g., 1920x1080)
target_size = (1920, 1080)
video_clip = video_clip.resize(target_size)
first_image = first_image.resize(target_size)
second_image = second_image.resize(target_size)
second_clip = second_clip.resize(target_size)

# Concatenate all clips
final_video = mp.concatenate_videoclips([video_clip, first_image, second_image, second_clip])

# Write the result
final_video.write_videofile("generated_video/output.mp4", fps=24)

# Close the clips to free up system resources
video_clip.close()
first_image.close()
second_image.close()
second_clip.close()