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
//  ASSETS
// =========

Rectangle :
    'rectangle' 'with' 'dimensions' width=INT 'per' height=INT 'color' color=STRING;

Text :
    'text' text=STRING;

Clip :
    'clip' path=STRING ('from' from=INT)? ('to' to=INT)?;

Image :
    'image' path=STRING;

// ===========
//  TERMINALS
// ============

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;
terminal POSITION: 'top' | 'bottom' | 'left' | 'right' | 'center';

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
