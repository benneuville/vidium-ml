grammar VidiumML

entry Document:
    (AssetCreation | Template | Pipeline);

// ===========
//  PIPELINE
// ===========

Pipeline:
    'pipeline' '{'
        'values' '=' valuesPath=STRING
        'template' '=' templatePath=STRING
        'export' 'as' exportPath=STRING
    '}';

// ===========
//  TEMPLATE
// ============

Template:
    'template' '{'
        elements+=TemplateElement*
    '}';

TemplateElement:
    Placeholder | TemplateComposition;

Placeholder:
    '[' name=STRING ']' duration=INT?;

TemplateComposition:
    '(' left=TemplateElement 'and' right=TemplateElement ')';

// TODO : Composition of placeholders

// =================
//  ASSETS CREATION
// =================

AssetCreation:
	(videos+=VideoAsset | images+=ImageAsset | customs+=CustomAsset)*;

VideoAsset:
    'new' 'video' 'named' name=ID '{'
        elements+=AssetElement*
    '}';

ImageAsset:
    'new' 'image' 'named' name=ID '{'
        elements+=AssetElement*
    '}';

CustomAsset:
    'new' 'custom' 'named' name=ID '{'
        elements+=AssetElement*
    '}';

// ==============
//  COMPOSITION
// ==============

AssetElement:
    (Asset | AssetComposition);

AssetComposition:
    '(' left=AssetElement 'and' right=AssetElement ')';

// ===================
//  ASSETS DEFINITION
// ===================

Asset:
    (DefineAsset | ReferenceAsset | AssetItem);

DefineAsset:
    'define' name=ID 'as' item=AssetItem;

ReferenceAsset:
    ('before' reference+=[DefineAsset:ID] 'set' | 'after' reference+=[DefineAsset:ID] 'set') item=AssetItem;

AssetItem:
    Rectangle | Clip | Image | Text;

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

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
