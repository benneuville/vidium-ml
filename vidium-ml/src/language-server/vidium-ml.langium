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
    (DefineAsset | ReferenceAsset | UseAsset | AssetItem );

DefineAsset:
    'define' name=ID 'as' item=AssetItem;

ReferenceAsset:
    ('before' reference+=[DefineAsset:ID] 'set' | 'after' reference+=[DefineAsset:ID] 'set') item=AssetItem;

UseAsset:
    'use' reference=[DefineAsset:ID] 'position' position=POSITION;

AssetItem:
    Rectangle | Clip | Image | Text;

// =========
//  PARAMETERS
// =========

fragment ColorParam:
    'color' color=COLOR;

fragment SizeParam:
    'size' size=INT;

fragment DurationParam:
    'duration' duration=INT;

fragment TimeSpanParam:
    ('from' from=INT)? ('to' to=INT)?;

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

Rectangle :
    'rectangle' 'with' 'dimensions' width=INT 'per' height=INT 'color' color=STRING;

// >> TEXT
Text:
    'text' text=STRING
    (ColorParam | SizeParam)*
    (TimeSpanParam)?
    (PositionParam | CoordinateParam)?
    (ScaleParam)?
    (RotateParam)?
    (OpacityParam)?;

// >> CLIP
Clip:
    'clip' path=STRING
    (TimeSpanParam)?
    (PositionParam | CoordinateParam)?
    (ScaleParam)?
    (RotateParam)?
    (OpacityParam)?;

// >> IMAGE
Image:
    'image' path=STRING
    (TimeSpanParam)?
    (PositionParam | CoordinateParam)?
    (ScaleParam)?
    (RotateParam)?
    (OpacityParam)?;

// ===========
//  TERMINALS
// ============

hidden terminal WS: /\s+/;
terminal COLOR: 'RED' | 'BLUE' | 'GREEN' | 'BLACK' | 'WHITE';
terminal POSITION: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'CENTER';
terminal ID: /[_a-zA-Z][\w_]*/;
terminal FLOAT returns number: /[0-9]*\.[0-9]+/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;


hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
