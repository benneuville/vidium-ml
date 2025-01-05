# vidium-ml

```
python3 -m venv vmlenv (the name must be vmlenv to get gitignored)
source vmlenv/bin/activate (linux)
./vmlenv/Scripts/activate (windows)

pip install movis
```

```
npm install
npm run build
npm run langium:generate 
node .\bin\cli generate .\scenario\test.vml
```

## Documentation
```
clip <path STRING> <transform> <time> 
image <path STRING> <transform> <time> 
text <text STRING> <transform> <time>
```

```
<transform> (unordered parameters)
- <scale FLOAT> or <scale x=FLOAT y=FLOAT> (default is 1)
- <rotate FLOAT> (default is 0)
- <position [CENTER, TOP, BOTTOM, LEFT, RIGHT]> or <coordinate x=INT y=INT> (default is CENTER)
- <opacity FLOAT> (default is 1)
```
```
<time> (optional parameters)
- <start FLOAT> (if not specified, the asset will start at the beginning of the video)
- <end FLOAT> (if not specified, the asset will end at the end of the video)
- if none specified, the asset will be displayed for the whole video
```

## Scope
The DSL objective is to create pipelines for generating structured videos from text.  
3 steps :
1. Define a template with placeholders, that works like a blueprint for videos.
2. Import the template and fill the placeholders with assets.
3. Generate the video.

This gives a common structure among the different videos created and enables automation of the video creation process.

## Assumption
Since the DSL is used to create pipelines for video creation, the users are expected to have a basic understanding of video editing and automation tools.
Its assumed that the users of the DSL are familiar with automation tools and have basic knowledge of the basic bricks of programming (like variables, loops, etc).

## Scenarios
**Company standard videos**  
A company wants to create a video following a standard structure for each of its products.
Following the same structure, the company can create a template for the videos and then customize each video with assets related to each product.

**Social network content creator**  
A content creator wants to create a series of videos with a common structure (like a trend).
The creator can create a template for the videos and then customize each video with assets related to the content.

