grammar VidiumML

entry Video:
    'video' 'named' name=ID '{'
        elements+=AssetElement*
    '}';

// ==============
//  COMPOSITION
// ==============

AssetElement:
    (Asset | AssetComposition);

AssetComposition:
    '(' left=AssetElement 'and' right=AssetElement ')';

// =========
//  ASSETS USAGE
// =========

Asset:
    (DefineAsset | UseAsset | AssetItem );

DefineAsset:
    'define' name=ID 'as' item=AssetItem;

UseAsset:
    'use' reference=[DefineAsset:ID]
    (ColorParam)?
    (SizeParam)?
    (PositionParam | CoordinateParam)?
    (ScaleParam)?
    (RotateParam)?
    (OpacityParam)?
    (TimeParam)?;

AssetItem:
    Clip | Image | Text | Audio | Transition | Subtitle | Background;

// =========
//  PARAMETERS
// =========

fragment ColorParam:
    'color' color=COLOR;

fragment SizeParam:
    'size' size=INT;

fragment TimeParam:
    (
        (('start' from_string=TIME) |
        (
            'start' 'after' reference=[DefineAsset:ID] |
            'start' after_string=TIME ('after' reference=[DefineAsset:ID]) |
            'start' before_string=TIME ('before' reference=[DefineAsset:ID])
        ))?
        (
            'end' to_string=TIME |
            'cut' 'from' cut_from_string=TIME 'to' cut_to_string=TIME |
            'lasts' 'for' duration_string=TIME
        )?
    ) (after=FLOAT before=FLOAT from=FLOAT cut_from=FLOAT cut_to=FLOAT duration=FLOAT to=FLOAT)?;


fragment PositionParam:
    'position' position=POSITION;

fragment CoordinateParam:
    'coordinate' 'x='coor_x=INT 'y=' coor_y=INT;

fragment ScaleParam:
    'scale' (('x=' scale_x=FLOAT 'y='scale_y=FLOAT) | scale=FLOAT);

fragment RotateParam:
    'rotate' rotate=FLOAT;

fragment OpacityParam:
    'opacity' opacity=FLOAT;

// =========
//  ASSETS
// =========

// >> TEXT
Text:
    'text' text=STRING
    (ColorParam)?
    (SizeParam)?
    (PositionParam | CoordinateParam)?
    (ScaleParam)?
    (RotateParam)?
    (OpacityParam)?
    (TimeParam)?;

// >> CLIP
Clip:
    'clip' path=STRING
    (PositionParam | CoordinateParam)?
    (ScaleParam)?
    (RotateParam)?
    (OpacityParam)?
    (TimeParam);

// >> IMAGE
Image:
    'image' path=STRING
    (PositionParam | CoordinateParam)?
    (ScaleParam)?
    (RotateParam)?
    (OpacityParam)?
    (TimeParam)?;

Audio:
    'audio' path=STRING
    (TimeParam)?;

Transition:
    'transition' type=TRANSITION
    (TimeParam);

// >> SUBTITLE
Subtitle:
    'subtitle' text=STRING
    (ColorParam)?
    (SizeParam)?
    (PositionParam | CoordinateParam)?
    (ScaleParam)?
    (OpacityParam)?
    (TimeParam)?;

Background:
    'background' color=COLOR
    (OpacityParam)?
    (TimeParam)?;

// ===========
//  TERMINALS
// ============

hidden terminal WS: /\s+/;
terminal TIME: ('0'..'9'+ ':' ('0'..'5')? '0'..'9' ':' ('0'..'5')?  '0'..'9' ('.' '0'..'9' ('0'..'9' ('0'..'9')?)?)? | // HH:MM:SS or HH:MM:SS.MS
                '0'..'9'+ ':' ('0'..'5')? '0'..'9' ('.' '0'..'9' ('0'..'9' ('0'..'9')?)?)? |                       // MM:SS or MM:SS.MS
                ('0'..'5')? '0'..'9' ('.' '0'..'9' ('0'..'9' ('0'..'9')?)?)?);
terminal TRANSITION: 'FADE';
terminal COLOR: 'RED' | 'BLUE' | 'GREEN' | 'BLACK' | 'WHITE';
terminal POSITION: /[A-Z]+(-[A-Z]+)?/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal FLOAT returns number: /[0-9]*\.[0-9]+/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;


hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;