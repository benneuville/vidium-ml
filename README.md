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

## Scope
The DSL objective is to create pipelines for generating structured videos from text.  
3 steps :
1. Define a template with placeholders, that works like a blueprint for videos.
2. Import the template and fill the placeholders with assets.
3. Generate the video.

This gives a common structure among the different videos created.

### Scenarios
**Company standard videos**  
A company wants to create a video following a standard structure for each of its products.
Following the same structure, the company can create a template for the videos and then customize each video with assets related to each product.

**Social network content creator**  
A content creator wants to create a series of videos with a common structure (like a trend).
The creator can create a template for the videos and then customize each video with assets related to the content.

