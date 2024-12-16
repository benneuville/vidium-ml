grammar VidiumML

entry Video:
	'video' name=ID '{'
	    'ASSETS'
	    assets+=AssetItem
        (assets+=AssetItem)*

        'LAYERS'
        layers+=Layer
        (layers+=Layer)*

        'SEQUENCES'
        sequences+=Sequence
        (sequences+=Sequence)*

        'TIMELINE'
        timelines+=TimeLine
        (timelines+=TimeLine)*

	'}';

TimeLine:
    'timeline' name=ID '{'
        composition+=[Sequence:ID]+ // References to Sequence
    '}';

Sequence:
    'sequence' name=ID ':' duration=INT '{'
        composition+=[Asset:ID]+ // References to Asset
    '}';

Layer:
    'layer' name=ID '{'
        composition+=[Asset:ID]+ // References to concrete Asset (Layer or AssetItem)
        timeSpan=TimeSpan
    '}';

TimeSpan:
    'duration' duration=INT
    ('offset' offset=INT)?;

Asset:
    (AssetItem | Layer);

AssetItem :
    'asset' name=ID ':' 'x='pos_x=INT 'y='pos_y=INT '{'
        assetItem=(Rectangle | Clip)
    '}';

Rectangle :
    'rectangle' ':' 'w='width=INT 'h='height=INT 'c='color=STRING;

Clip :
    'clip' ':' path=STRING 'from' ':' from=INT 'to' ':' to=INT;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
