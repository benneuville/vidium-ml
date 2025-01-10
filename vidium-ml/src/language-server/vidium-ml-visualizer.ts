import { Video } from './generated/ast';


export class VidiumMLVisualizerService {
    private currentVideo?: Video;
    private visualizerData: VisualizerProviderInterface[] = [];

    setVideo(video: Video): void {
        this.currentVideo = video;
        this.visualizerData.forEach(visualizerData => visualizerData.updateView());
    }

    setVisualizerData(visualizerData: VisualizerProviderInterface): void {
        this.visualizerData.push(visualizerData);
    }

    removeVisualizerData(visualizerData: VisualizerProviderInterface): void {
        const index = this.visualizerData.indexOf(visualizerData);
        if (index > -1) {
            this.visualizerData.splice(index, 1);
        }
    }

    getCurrentVideo(): Video | undefined {
        return this.currentVideo;
    }
}