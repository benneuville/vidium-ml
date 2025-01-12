import { AssetElement, Audio, Video, Clip, Image, Text, Transition, UseAsset, AssetItem, isDefineAsset, isUseAsset, DefineAsset } from '../language-server/generated/ast';
import { getVideoDurationInSeconds } from 'get-video-duration';

type SimplifiedAsset = {
    $type: string;
    from?: number;
    to?: number;
    path?: string;
    text?: string;
    type?: string;
}

type GeneralAsset = SimplifiedAsset | AssetElement;

export class VisualizerVideoBuilder {

    private _definedAssets: Map<string, AssetElement> = new Map<string, AssetElement>();

    private __size_asset_element = 20;
    private __size_asset_element_padding = 5;
    //private __size_asset_element_border = 1;
        /*ruler*/
    private __ruler_num_c = "#888";
    private __ruler_num_fz = "10px";
    private __ruler_unit = "1px";
    private __ruler_x = 3;
    private __ruler_y = 1;

        /*Low ticks*/
    private __ruler1_bdw = "1px";
    private __ruler1_c = "#BBB";
    private __ruler1_h = "8px";
    private __ruler1_space = 5;

        /*High ticks*/
    private __ruler2_bdw = "2px";
    private __ruler2_c = "#BBB";
    private __ruler2_h = "20px";
    private __ruler2_space = 50;

    constructor() {
    }

    async build(video: Video | undefined): Promise<string> {
        if(!video) {
            return '<h1>No video found</h1>';
        }
        return await this.buildVideo(video);
    }

    public getRootVariableCSS(): string {
        return `#ruler {
            --ruler-num-c: ${this.__ruler_num_c};
            --ruler-num-fz: ${this.__ruler_num_fz};
            --ruler-unit: ${this.__ruler_unit};
            --ruler-x: ${this.__ruler_x};
            --ruler-y: ${this.__ruler_y};

            --ruler1-bdw: ${this.__ruler1_bdw};
            --ruler1-c: ${this.__ruler1_c};
            --ruler1-h: ${this.__ruler1_h};
            --ruler1-space: ${this.__ruler1_space};

            --ruler2-bdw: ${this.__ruler2_bdw};
            --ruler2-c: ${this.__ruler2_c};
            --ruler2-h: ${this.__ruler2_h};
            --ruler2-space: ${this.__ruler2_space};

            width: 100%;
            height: 20px;

            background-image:
                linear-gradient(90deg, var(--ruler1-c) 0 var(--ruler1-bdw), transparent 0),
                linear-gradient(90deg, var(--ruler2-c) 0 var(--ruler2-bdw), transparent 0)
                ;
            background-position: 0 0;
            background-repeat: repeat-x, repeat-x;
            background-size:
                calc(var(--ruler-unit) * var(--ruler1-space) * var(--ruler-x)) var(--ruler1-h),
                calc(var(--ruler-unit) * var(--ruler2-space) * var(--ruler-x)) var(--ruler2-h),
                var(--ruler1-h) calc(var(--ruler-unit) * var(--ruler1-space) * var(--ruler-y)),
                var(--ruler2-h) calc(var(--ruler-unit) * var(--ruler2-space) * var(--ruler-y));
        }`;
        
    }

    private async buildVideo(video : Video): Promise<string> {
        let htmlcontent = ``;

        //declare container for video timeline
        htmlcontent += `<div id="video_container">`;

        //RULER
        htmlcontent += this.buildRuler();

        htmlcontent += `<div class="asset_container">`;
        let elements = video.elements;
        if(elements) {
            this._definedAssets.clear();
            elements.filter((element) => isDefineAsset(element)).forEach((element) => {
                this._definedAssets.set((element as DefineAsset).name, (element as DefineAsset).item);
            });

            let assets = elements.filter((element) => !isDefineAsset(element));
            let size = assets.length-1;
            for(let i = 0; i < assets.length; i++) {
                htmlcontent += await this.addAssetElement(assets[i], size - i);
            }
        }

        htmlcontent += `</div>`;

        return htmlcontent;
    }

    private buildRuler(): string {
        let htmlcontent = `<div id="ruler"></div>`;
        return htmlcontent;
    }

    private async addAssetElement(element: GeneralAsset, index: number): Promise<string> {
        let htmlcontent = ``;
        switch(element.$type) {
            case 'Audio':
                htmlcontent += await this.addAudio(element, index);
                break;
            case 'Clip':
                htmlcontent += await this.addClip(element, index);
                break;
            case 'Image':
                htmlcontent += await this.addImage(element, index);
                break;
            case 'Text':
                htmlcontent += await this.addText(element, index);
                break;
            case 'Transition':
                htmlcontent += await this.addTransition(element, index);
                break;
            case 'UseAsset':
                htmlcontent += await this.addUseAsset(element as UseAsset, index);
                break;
            case 'AssetComposition':
                //htmlcontent += this.addAssetComposition(element);
                break;
            default:
                break;
        }
        return htmlcontent;
     }

    async addAudio(element: Audio | SimplifiedAsset, index: number = 0) : Promise<string> {
        if(!element) return '';
        let left = (element.from || 0) * this.__ruler2_space * this.__ruler_x + "px";
        let width = ``;
        if(element.to)
            width ="calc(" + ((element.to) * this.__ruler2_space * this.__ruler_x - (element.from || 0) * this.__ruler2_space * this.__ruler_x) + "px" + " - " + this.__size_asset_element_padding + "px)";
        else if(element.path) {
            let duration = await getVideoDurationInSeconds(__dirname.replace("\\", "/") + "/../../" + element.path);
            width = `calc(${duration} * ${this.__ruler2_space * this.__ruler_x}px - ${this.__size_asset_element_padding}px)`;

        }
        let path = element.path?.split('/').pop();
        let top = "0";
        // top = (this.__size_asset_element + this.__size_asset_element_border) * index + "px";
        let height = this.__size_asset_element + "px";
        return `<div class="audio" style="left: ${left}; top: ${top}; width: ${width}; height: ${height};">${element.$type} : ${path}</div>`;
    }

    async addClip(element: Clip | SimplifiedAsset, index: number = 0): Promise<string> {
        if(!element) return '';
        let left = (element.from || 0) * this.__ruler2_space * this.__ruler_x + "px";
        let width = ``;
        if(element.to)
            width ="calc(" + ((element.to) * this.__ruler2_space * this.__ruler_x - (element.from || 0) * this.__ruler2_space * this.__ruler_x) + "px" + " - " + this.__size_asset_element_padding + "px)";
        else if(element.path) {
            let duration = await getVideoDurationInSeconds(__dirname.replace("\\", "/") + "/../../" + element.path);
            width = `calc(${duration} * ${this.__ruler2_space * this.__ruler_x}px - ${this.__size_asset_element_padding}px)`;

        }
        let path = element.path?.split('/').pop();
        let top = "0";
        // top = (this.__size_asset_element + this.__size_asset_element_border) * index + "px";
        let height = this.__size_asset_element + "px";
        return `<div class="clip" style="left: ${left}; top: ${top}; width: ${width}; height: ${height};">${element.$type} : ${path}</div>`;
    }

    addImage(element: Image | SimplifiedAsset, index: number = 0) {
        if(!element) return '';
        let left = (element.from || 0) * this.__ruler2_space * this.__ruler_x + "px";
        let width ="calc(" + (element.to ?((element.to) * this.__ruler2_space * this.__ruler_x - (element.from || 0) * this.__ruler2_space * this.__ruler_x) + "px" : " 100% - " + left) + " - " + this.__size_asset_element_padding + "px)";
        let path = element.path?.split('/').pop();
        let top = "0";
        // top = (this.__size_asset_element + this.__size_asset_element_border) * index + "px";
        let height = this.__size_asset_element + "px";
        return `<div class="image" style="left: ${left}; top: ${top}; width: ${width}; height: ${height};">${element.$type} : ${path}</div>`;
    }

    addText(element: Text | SimplifiedAsset, index: number = 0) {
        if(!element) return '';
        let left = (element.from || 0) * this.__ruler2_space * this.__ruler_x + "px";
        let width ="calc(" + (element.to ?((element.to) * this.__ruler2_space * this.__ruler_x) + "px" : " 100% - " + left) + " - " + this.__size_asset_element_padding + "px)";
        let top = "0";
        // top = (this.__size_asset_element + this.__size_asset_element_border) * index + "px";
        let height = this.__size_asset_element + "px";
        return `<div class="text" style="left: ${left}; top: ${top}; width: ${width}; height: ${height};">${element.$type} : ${element.text}</div>`;
    }

    addTransition(element: Transition | SimplifiedAsset, index: number = 0) {
        if(!element) return '';
        let left = (element.from || 0) * this.__ruler2_space * this.__ruler_x + "px";
        let width ="calc(" + (element.to ?((element.to) * this.__ruler2_space * this.__ruler_x - (element.from || 0) * this.__ruler2_space * this.__ruler_x) + "px" : " 100% - " + left) + " - " + this.__size_asset_element_padding + "px)";
        let top = "0";
        // top = (this.__size_asset_element + this.__size_asset_element_border) * index + "px";
        let height = this.__size_asset_element + "px";
        return `<div class="transition" style="left: ${left}; top: ${top}; width: ${width}; height: ${height};">${element.$type} : ${element.type}</div>`;
    }

    async addUseAsset(element: UseAsset, index: number = 0) : Promise<string> {
        if(!element) return '';
        let ref = element.reference.$refText;
        let asset = this._definedAssets.get(ref);

        while(asset && isUseAsset(asset)) {
            asset = this._definedAssets.get((asset as unknown as UseAsset).reference.$refText);
        }

        asset = asset as unknown as AssetItem;

        if(asset && !isDefineAsset(asset)) {
            let SimplifiedAsset: SimplifiedAsset = {
                $type: asset.$type,
                from: element.from ? element.from : asset.from,
                to: element.to ? element.to : asset.to
            }
            if(asset.$type == 'Text') {
                SimplifiedAsset.text = asset.text || '';
            }
            if(asset.$type == 'Image' || asset.$type == 'Audio' || asset.$type == 'Clip') {
                SimplifiedAsset.path = asset.path;
            }
            if(asset.$type == 'Transition') {
                SimplifiedAsset.type = asset.type;
            }
            return await this.addAssetElement(SimplifiedAsset, index);
        }
        return '';
    }
}

